import { useState } from 'react';
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

export default function AuthModal({ onClose, initialView = 'login' }) {
  const [view, setView] = useState(initialView);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [remember, setRemember] = useState(true);

  const { signIn, signUp, resetPassword } = useAuth();

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
    setSuccess('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (view === 'login') {
        await signIn({ email: form.email, password: form.password });
        onClose();
      } else if (view === 'register') {
        await signUp({
          email: form.email,
          password: form.password,
          name: form.name,
          phone: form.phone,
        });
        onClose();
      } else if (view === 'forgot') {
        await resetPassword(form.email);
        setSuccess('Email de recuperação enviado! Verifique sua caixa de entrada.');
      }
    } catch (err) {
      const messages = {
        'Invalid login credentials':                     'Email ou senha incorretos.',
        'User already registered':                       'Este email já está cadastrado.',
        'Password should be at least 6 characters':      'A senha deve ter pelo menos 6 caracteres.',
        'Email not confirmed':                           'Confirme seu email antes de entrar.',
        'Unable to validate email address: invalid format': 'Formato de email inválido.',
        'Signup requires a valid password':               'Informe uma senha válida.',
        'Email rate limit exceeded':                     'Muitas tentativas. Aguarde um momento antes de tentar novamente.',
        'For security purposes, you can only request this after 60 seconds': 'Aguarde 60 segundos para tentar novamente.',
        'User not found':                                'Nenhuma conta encontrada com este email.',
      };
      const friendly = messages[err.message]
        || (err.message?.includes('rate') ? 'Muitas tentativas. Tente novamente em instantes.' : null)
        || (err.message?.includes('network') ? 'Sem conexão. Verifique sua internet.' : null)
        || err.message
        || 'Erro inesperado. Tente novamente.';
      setError(friendly);
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

                {error && <p className="auth-error">{error}</p>}

                <div className="auth-field">
                  <label className="auth-label">Seu e-mail</label>
                  <input
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
                  <label className="auth-label">Sua senha</label>
                  <input
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

                <label className="auth-remember">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  Deseja lembrar?
                </label>
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

                <button
                  type="button"
                  className="auth-link"
                  onClick={() => switchView('forgot')}
                >
                  Esqueceu a sua senha?
                </button>
              </div>
            </>
          )}

          {/* ── REGISTER VIEW ── */}
          {view === 'register' && (
            <>
              <div className="auth-body">
                {error && <p className="auth-error">{error}</p>}

                <div className="auth-field">
                  <label className="auth-label">E-mail de acesso</label>
                  <input
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
                  <label className="auth-label">Seu nome</label>
                  <input
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
                  <label className="auth-label">Telefone para Contato</label>
                  <input
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
                  <label className="auth-label">Sua senha</label>
                  <input
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
                  <a href="#" onClick={(e) => e.preventDefault()}>Política de Privacidade</a>
                  {' '}e os{' '}
                  <a href="#" onClick={(e) => e.preventDefault()}>Termos de Serviço</a>.
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

          {/* ── FORGOT VIEW ── */}
          {view === 'forgot' && (
            <>
              <div className="auth-body">
                <MercadoLogo />

                {error && <p className="auth-error">{error}</p>}
                {success && <p className="auth-success">{success}</p>}

                <p className="auth-forgot-hint">
                  Informe seu e-mail e enviaremos um link para redefinir a senha.
                </p>

                <div className="auth-field">
                  <label className="auth-label">Seu e-mail</label>
                  <input
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
                      Enviando…
                    </span>
                  ) : 'Enviar email'}
                </button>

                <button
                  type="button"
                  className="auth-btn-dark"
                  onClick={() => switchView('login')}
                >
                  ← Voltar ao login
                </button>
              </div>
            </>
          )}

        </form>
      </div>
    </div>
  );
}
