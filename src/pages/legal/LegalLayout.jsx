import { Link } from 'react-router-dom';
import Icon from '../../components/ui/Icon';

const pageStyle = {
  maxWidth: 720,
  margin: '0 auto',
  padding: '40px 20px 80px',
  lineHeight: 1.7,
  color: '#334155',
};

const titleStyle = {
  fontSize: '1.75rem',
  fontWeight: 800,
  color: '#0f172a',
  marginBottom: 8,
};

export function LegalPageLayout({ title, children }) {
  return (
    <div style={pageStyle}>
      <Link to="/" style={{ color: '#16a34a', fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem' }}>
        ← Voltar ao início
      </Link>
      <h1 style={{ ...titleStyle, marginTop: 24 }}>{title}</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: '0.95rem' }}>
        {children}
      </div>
    </div>
  );
}

export function LegalSection({ title, children }) {
  return (
    <section>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>{title}</h2>
      {children}
    </section>
  );
}

export function LegalNotice({ children }) {
  return (
    <p style={{
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: 10,
      padding: '12px 14px',
      fontSize: '0.85rem',
      color: '#64748b',
    }}>
      <Icon name="info" size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
      {children}
    </p>
  );
}
