import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/ui/Icon';
import './admin.css';

const NAV_ITEMS = [
  { to: '/admin',                  label: 'Dashboard',    icon: 'dashboard',         end: true },
  { to: '/admin/pedidos',          label: 'Pedidos',      icon: 'package_2'                   },
  { to: '/admin/clientes',         label: 'Clientes',     icon: 'group'                       },
  { to: '/admin/produtos',         label: 'Produtos',     icon: 'inventory_2'                 },
  { to: '/admin/categorias',       label: 'Categorias',   icon: 'label'                       },
  { to: '/admin/configuracoes',    label: 'Configurações', icon: 'settings'                   },
  { to: '/admin/cupons',           label: 'Cupons',        icon: 'confirmation_number'        },
  { to: '/admin/promocoes',        label: 'Promoções',     icon: 'sell'                       },
  { to: '/admin/agenda',           label: 'Agenda',        icon: 'event_note'                 },
  { to: '/admin/rotas',            label: 'Rotas',         icon: 'route'                      },
  { to: '/admin/entregadores',     label: 'Entregadores',  icon: 'person_pin'                 },
  { to: '/admin/geocodificacao',   label: 'Geocódigos',    icon: 'my_location'                },
];

function AdminSidebar({ profile, onNavigate, onSignOut }) {
  return (
    <>
      <div className="admin-sidebar-logo">
        <span className="admin-sidebar-logo-icon" style={{
          width: 32, height: 32, borderRadius: 8,
          background: '#16a34a', color: '#fff',
          display: 'inline-flex', alignItems: 'center',
          justifyContent: 'center', fontWeight: 700,
          fontSize: 14, flexShrink: 0, letterSpacing: '-0.5px',
        }}>
          CL
        </span>
        <div>
          <div className="admin-sidebar-logo-title">Chamão Lucca</div>
          <div className="admin-sidebar-logo-sub">Painel Admin</div>
        </div>
      </div>

      <nav className="admin-nav">
        {NAV_ITEMS.map(({ to, label, icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `admin-nav-item ${isActive ? 'admin-nav-item--active' : ''}`
            }
          >
            <span className="admin-nav-icon"><Icon name={icon} size={20} /></span>
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="admin-sidebar-footer">
        <div className="admin-sidebar-user">
          <div className="admin-sidebar-avatar">
            {profile?.name?.[0]?.toUpperCase() ?? 'A'}
          </div>
          <div className="admin-sidebar-user-info">
            <div className="admin-sidebar-user-name">{profile?.name ?? 'Admin'}</div>
            <div className="admin-sidebar-user-role">Administrador</div>
          </div>
        </div>
        <button className="admin-signout-btn" onClick={onSignOut}>
          Sair
        </button>
        <a
          href="/"
          className="admin-store-link"
          target="_blank"
          rel="noreferrer"
        >
          Ver loja ↗
        </a>
      </div>
    </>
  );
}

export default function AdminLayout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  const currentLabel = NAV_ITEMS.find(({ to, end }) =>
    end ? location.pathname === to : location.pathname.startsWith(to)
  )?.label ?? 'Admin';

  return (
    <div className="admin-shell">
      {menuOpen && (
        <button
          type="button"
          className="admin-mobile-overlay"
          aria-label="Fechar menu"
          onClick={closeMenu}
        />
      )}

      <aside className={`admin-sidebar${menuOpen ? ' admin-sidebar--open' : ''}`}>
        <AdminSidebar
          profile={profile}
          onNavigate={closeMenu}
          onSignOut={handleSignOut}
        />
      </aside>

      <main className="admin-content">
        <header className="admin-mobile-header">
          <button
            type="button"
            className="admin-mobile-menu-btn"
            aria-label="Abrir menu"
            onClick={() => setMenuOpen(true)}
          >
            <Icon name="menu" size={22} />
          </button>
          <span className="admin-mobile-title">{currentLabel}</span>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
