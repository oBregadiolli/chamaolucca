import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import fotoLaranja from '../../assets/fotoLaranja.png';

/* ─── logo inline ─── */
function MercadoLogo() {
  return (
    <div className="auth-logo">
      <img src={fotoLaranja} alt="Laranja" className="auth-logo-icon" />
      <span className="auth-logo-text">mercado</span>
    </div>
  );
}

const LOGIN_GUARD_KEY = 'chamaolucca_login_guard';

function readLoginGuard() {
  try {
    const raw = sessionStorage.getItem(LOGIN_GUARD_KEY);
    return raw ? JSON.parse(raw) : { failures: 0, blockedUntil: 0 };
  } catch {
    return { failures: 0, blockedUntil: 0 };
  }
}

function writeLoginGuard(guard) {
  sessionStorage.setItem(LOGIN_GUARD_KEY, JSON.stringify(guard));
}

function blockSeconds(failures) {
  if (failures >= 5) return 300;
  if (failures >= 3) return 30;
  return 0;
}

export default function AuthModal({ onClose, initialView = 'login' }) {
  const [view, setView] = useState(initialView);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [blockedUntil, setBlockedUntil] = useState(() => readLoginGuard().blockedUntil || 0);
  const [now, setNow] = useState(Date.now());

  const { signIn, signUp } = useAuth();

  useEffect(() => {
    if (blockedUntil <= Date.now()) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [blockedUntil]);

  const loginBlocked = view === 'login' && blockedUntil > now;
  const blockRemainingSec = loginBlocked ? Math.ceil((blockedUntil - now) / 1000) : 0;

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  }

  function formatPhone(value) {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits.replace(/^(\d{0,2})/, '($1');
    if (digits.length <= 6) return digits.replace(/^(\d{2})(\d{0,4})/, '($1) $2');
    if (digits.length <= 10) return digits.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    return digits.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
  }

  function handlePhoneChange(e) {
    const masked = formatPhone(e.target.value);
    setForm({ ...form, phone: masked });
    setError('');
  }

  function switchView(v) {
    setView(v);
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (view === 'login') {
        if (loginBlocked) {
          setError(`Aguarde ${blockRemainingSec}s antes de tentar novamente.`);
          return;
        }
        await signIn({ email: form.email, password: form.password });
        writeLoginGuard({ failures: 0, blockedUntil: 0 });
        setBlockedUntil(0);
        onClose();
      } else if (view === 'register') {
        await signUp({
          email: form.email,
          password: form.password,
          name: form.name,
          phone: form.phone,
        });
        onClose();
      }
    } catch (err) {
      const msg = (err.message || '').toLowerCase();
      const code = (err.code || '').toLowerCase();

      // Mapa de traduções: chave é substring (lowercase) da mensagem do Supabase
      const translations = [
        ['invalid login credentials',             'Email ou senha incorretos.'],
        ['user already registered',                'Este email já está cadastrado.'],
        ['password should be at least 6',          'A senha deve ter pelo menos 6 caracteres.'],
        ['email not confirmed',                    'Confirme seu email antes de entrar.'],
        ['unable to validate email',               'Formato de email inválido.'],
        ['signup requires a valid password',        'Informe uma senha válida.'],
        ['email rate limit exceeded',              'Limite de emails atingido. Aguarde cerca de 1 hora ou tente fazer login se já se cadastrou.'],
        ['over_email_send_rate_limit',             'Limite de emails atingido. Aguarde cerca de 1 hora ou tente fazer login se já se cadastrou.'],
        ['request this after',                     'Aguarde alguns segundos para tentar novamente.'],
        ['user not found',                         'Nenhuma conta encontrada com este email.'],
        ['rate',                                   'Muitas tentativas. Tente novamente em instantes.'],
        ['network',                                'Sem conexão. Verifique sua internet.'],
        ['fetch',                                  'Erro de conexão. Verifique sua internet.'],
        ['already been registered',                'Este email já está cadastrado.'],
        ['provide.*email',                         'Informe um email válido.'],
        ['weak_password',                          'A senha deve ter pelo menos 6 caracteres.'],
      ];

      let friendly = null;
      for (const [key, translated] of translations) {
        if (msg.includes(key) || code.includes(key)) {
          friendly = translated;
          break;
        }
      }

      setError(friendly || 'Erro inesperado. Tente novamente.');

      if (view === 'login') {
        const guard = readLoginGuard();
        const failures = guard.failures + 1;
        const seconds = blockSeconds(failures);
        const nextBlocked = seconds > 0 ? Date.now() + seconds * 1000 : 0;
        writeLoginGuard({ failures, blockedUntil: nextBlocked });
        setBlockedUntil(nextBlocked);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>

        {/* Close pill */}
        <button className="auth-close" onClick={onClose} aria-label="Fechar">
          <span className="material-symbols-rounded">close</span>
        </button>

        <form onSubmit={handleSubmit} noValidate>

          {/* ── LOGIN VIEW ── */}
          {view === 'login' && (
            <>
              <div className="auth-body">
                <MercadoLogo />

                {error && <p className="auth-error" role="alert">{error}</p>}

                <div className="auth-field">
                  <label className="auth-label" htmlFor="auth-login-email">Seu e-mail</label>
                  <input
                    id="auth-login-email"
                    className="auth-input"
                    type="email"
                    name="email"
                    placeholder="exemplo@gmail.com"
                    value={form.email}
                    onChange={handleChange}
                    required
                    autoFocus
                  />
                </div>

                <div className="auth-field">
                  <label className="auth-label" htmlFor="auth-login-password">Sua senha</label>
                  <input
                    id="auth-login-password"
                    className="auth-input"
                    type="password"
                    name="password"
                    placeholder="Qual é a sua senha?"
                    value={form.password}
                    onChange={handleChange}
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div className="auth-footer">
                <button
                  type="submit"
                  className="auth-btn-primary"
                  disabled={loading || loginBlocked}
                >
                  {loginBlocked ? (
                    `Aguarde ${blockRemainingSec}s…`
                  ) : loading ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                      Entrando…
                      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </span>
                  ) : 'Entrar'}
                </button>

                <button
                  type="button"
                  className="auth-btn-dark"
                  onClick={() => switchView('register')}
                >
                  Não tenho Cadastro
                </button>
              </div>
            </>
          )}

          {/* ── REGISTER VIEW ── */}
          {view === 'register' && (
            <>
              <div className="auth-body">
                {error && <p className="auth-error" role="alert">{error}</p>}

                <div className="auth-field">
                  <label className="auth-label" htmlFor="auth-register-email">E-mail de acesso</label>
                  <input
                    id="auth-register-email"
                    className="auth-input"
                    type="email"
                    name="email"
                    placeholder="Adicione seu e-mail"
                    value={form.email}
                    onChange={handleChange}
                    required
                    autoFocus
                  />
                </div>

                <div className="auth-field">
                  <label className="auth-label" htmlFor="auth-register-name">Seu nome</label>
                  <input
                    id="auth-register-name"
                    className="auth-input"
                    type="text"
                    name="name"
                    placeholder="Adicione seu nome"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="auth-field">
                  <label className="auth-label" htmlFor="auth-register-phone">Telefone para Contato</label>
                  <input
                    id="auth-register-phone"
                    className="auth-input"
                    type="tel"
                    name="phone"
                    placeholder="(11) 91234-5678"
                    value={form.phone}
                    onChange={handlePhoneChange}
                    maxLength={15}
                    inputMode="numeric"
                  />
                </div>

                <div className="auth-field">
                  <label className="auth-label" htmlFor="auth-register-password">Sua senha</label>
                  <input
                    id="auth-register-password"
                    className="auth-input"
                    type="password"
                    name="password"
                    placeholder="Adicione sua senha"
                    value={form.password}
                    onChange={handleChange}
                    required
                    minLength={6}
                  />
                </div>

                <p className="auth-terms">
                  Ao se cadastrar, concorda com a{' '}
                  <Link to="/privacidade" onClick={onClose}>Política de Privacidade</Link>
                  {' '}e os{' '}
                  <Link to="/termos" onClick={onClose}>Termos de Serviço</Link>.
                </p>
              </div>

              <div className="auth-footer">
                <button
                  type="submit"
                  className="auth-btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                      Cadastrando…
                    </span>
                  ) : 'Cadastrar'}
                </button>

                <button
                  type="button"
                  className="auth-btn-dark"
                  onClick={() => switchView('login')}
                >
                  Já tenho Conta
                </button>

                <MercadoLogo />
              </div>
            </>
          )}

        </form>
      </div>
    </div>
  );
}
