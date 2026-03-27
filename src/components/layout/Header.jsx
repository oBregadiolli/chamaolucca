import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import Icon from '../ui/Icon';
import logobylucca from '../../assets/logobylucca.png';
import HowToGetDialog from '../ui/HowToGetDialog';

export default function Header({ onOpenAuth }) {
  const { user, profile } = useAuth();
  const { totalItems, setIsOpen: openCart } = useCart();
  const location = useLocation();
  const [showHowTo, setShowHowTo] = useState(false);

  const isHome   = location.pathname === '/';
  const isAdmin  = profile?.role === 'admin';

  return (
    <>
      <header className="header">
        <div className="header-inner">
          {/* Logo */}
          <Link to="/" className="header-logo" aria-label="ChamaoLucca — ir para início">
            <img
              src={logobylucca}
              alt="ChamaoLucca"
              style={{ height: 36, width: 'auto', display: 'block' }}
            />
          </Link>

          <div className="header-actions">
            {/* Como chegar — only on store pages, not landing */}
            {!isHome && (
              <button
                className="header-howto-btn"
                onClick={() => setShowHowTo(true)}
                aria-label="Como chegar ao Lucca Mercado"
              >
                <Icon name="location_on" size={16} fill />
                <span className="header-howto-label">Como chegar?</span>
              </button>
            )}

            {/* Cart — hidden for admins (they manage the store, not shop it) */}
            {!isHome && !isAdmin && (
              <button
                className="cart-btn header-cart-desktop"
                onClick={() => openCart(true)}
                aria-label="Abrir carrinho"
              >
                <Icon name="shopping_cart" size={18} fill /> Carrinho
                {totalItems > 0 && (
                  <span className="badge badge-green">{totalItems}</span>
                )}
              </button>
            )}

            {/* Profile / Auth */}
            {user ? (
              <Link
                to={isAdmin ? '/admin' : '/perfil'}
                className="btn btn-ghost btn-sm"
                aria-label={isAdmin ? 'Painel admin' : 'Meu perfil'}
                title={isAdmin ? 'Ir para o painel admin' : 'Meu perfil'}
                style={{ fontSize: '1.25rem', padding: '8px 10px' }}
              >
                <Icon name={isAdmin ? 'admin_panel_settings' : 'person'} size={22} fill />
              </Link>
            ) : (
              <button className="btn btn-primary btn-sm" onClick={onOpenAuth}>
                Entrar
              </button>
            )}
          </div>
        </div>
      </header>

      {showHowTo && <HowToGetDialog onClose={() => setShowHowTo(false)} />}
    </>
  );
}
