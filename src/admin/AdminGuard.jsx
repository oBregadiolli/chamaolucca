import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * AdminGuard — protects all /admin/* routes.
 *
 * Decision tree:
 *  1. Still loading (session + profile not yet resolved) → show neutral loading screen
 *  2. No user (not logged in)                           → redirect to / with current path saved
 *  3. User authenticated but role !== 'admin'           → redirect to / (silent, no error leakage)
 *  4. User is admin                                     → render children
 *
 * Security notes:
 *  - Guard alone is NOT the security boundary. Supabase RLS is.
 *  - This guard prevents UI access and avoids leaking admin routes to non-admins.
 *  - The isAdmin flag comes from the profile fetched server-side, not from localStorage.
 */
export default function AdminGuard({ children }) {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();

  // Phase 1: auth + profile still resolving — show neutral screen
  // (never show a flash of admin content)
  if (loading) {
    return (
      <div style={styles.loadingShell}>
        <div style={styles.loadingDot} />
        <span style={styles.loadingText}>Verificando acesso…</span>
      </div>
    );
  }

  // Phase 2: not authenticated at all
  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Phase 3: authenticated but not admin
  if (!isAdmin) {
    // Silent redirect — don't expose that /admin exists to regular users
    return <Navigate to="/" replace />;
  }

  // Phase 4: all clear
  return children;
}

// Inline keyframe so the spinner works before admin.css loads
if (typeof document !== 'undefined' && !document.getElementById('ag-guard-style')) {
  const s = document.createElement('style');
  s.id = 'ag-guard-style';
  s.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(s);
}

const styles = {
  loadingShell: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    gap: '12px',
    background: '#f8fafc',
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  loadingDot: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: '3px solid #bbf7d0',
    borderTopColor: '#16a34a',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    fontSize: '0.875rem',
    color: '#94a3b8',
    fontWeight: '500',
  },
};
