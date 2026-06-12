import { Link } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import { usePageTitle } from '../hooks/usePageTitle';

export default function NotFound() {
  usePageTitle('Página não encontrada — ChamaoLucca');

  return (
    <div style={{
      minHeight: '50vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 16px',
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: 420,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        alignItems: 'center',
      }}>
        <Icon name="search_off" size={48} style={{ color: '#d1d5db' }} />
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
          Página não encontrada
        </h1>
        <p style={{ color: '#64748b', lineHeight: 1.6, margin: 0 }}>
          O endereço que você acessou não existe ou foi movido.
        </p>
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px 20px',
            background: '#16a34a',
            color: '#fff',
            borderRadius: 10,
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
