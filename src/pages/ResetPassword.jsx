import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Icon from '../components/ui/Icon';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      setHasSession(!!session);
      setLoading(false);
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setHasSession(!!session);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }

    setSaving(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) throw updateErr;
      setSuccess(true);
      setTimeout(() => navigate('/perfil'), 2000);
    } catch (err) {
      setError(err.message || 'Não foi possível redefinir a senha.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div style={{ maxWidth: 420, margin: '48px auto', padding: 24, textAlign: 'center' }}>
        <Icon name="link_off" size={40} style={{ color: '#d1d5db' }} />
        <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '16px 0 8px' }}>Link inválido ou expirado</h1>
        <p style={{ color: '#64748b', marginBottom: 20 }}>
          Solicite um novo e-mail de recuperação na tela de login.
        </p>
        <Link to="/loja" style={{ color: '#16a34a', fontWeight: 700 }}>Ir para a loja</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 420, margin: '48px auto', padding: '0 20px 80px' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>Nova senha</h1>
      <p style={{ color: '#64748b', marginBottom: 24 }}>Escolha uma nova senha para sua conta.</p>

      {success ? (
        <p style={{ color: '#059669', fontWeight: 600 }}>Senha atualizada! Redirecionando…</p>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && <p style={{ color: '#dc2626', fontSize: '0.9rem' }}>{error}</p>}

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Nova senha</span>
            <input
              type="password"
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
              autoFocus
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Confirmar senha</span>
            <input
              type="password"
              className="auth-input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={6}
              required
            />
          </label>

          <button type="submit" className="auth-btn-primary" disabled={saving} style={{ marginTop: 8 }}>
            {saving ? 'Salvando…' : 'Salvar nova senha'}
          </button>
        </form>
      )}
    </div>
  );
}
