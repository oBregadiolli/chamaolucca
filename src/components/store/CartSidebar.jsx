import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../lib/utils';
import Icon from '../ui/Icon';

export default function CartSidebar({ onOpenAuth }) {
  const { items, subtotal, updateQuantity, removeItem } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  function handleProceed() {
    if (!user) {
      onOpenAuth?.();
      return;
    }
    navigate('/checkout');
  }

  return (
    <div className="cart-sidebar-card">
      {/* Header */}
      <div className="cart-sidebar-head">
        <div className="cart-sidebar-logo-circle">
          <Icon name="shopping_cart" size={22} fill style={{ color: '#16a34a' }} />
        </div>
        <div>
          <div className="cart-sidebar-store-label">Monte sua Sacola</div>
          <div className="cart-sidebar-store-name">ChamaoLucca</div>
        </div>
      </div>

      {items.length === 0 ? (
        /* Empty */
        <div className="cart-sidebar-empty">
          <div className="cart-sidebar-bag">
            <Icon name="shopping_bag" size={48} style={{ color: '#d1d5db' }} />
          </div>
          <h3>Sua sacola está vazia</h3>
          <p>Monte sua lista em um clique</p>
        </div>
      ) : (
        <>
          {/* Items */}
          <div className="cart-sidebar-items">
            {items.map((item) => (
              <SidebarItem
                key={item.id}
                item={item}
                onUpdate={updateQuantity}
                onRemove={removeItem}
              />
            ))}
          </div>

          {/* Subtotal */}
          <div className="cart-sidebar-subtotal">
            <span className="cart-sidebar-subtotal-label">Subtotal:</span>
            <span className="cart-sidebar-subtotal-value">
              {formatCurrency(subtotal)}
            </span>
          </div>

          {/* Proceed */}
          <div className="cart-sidebar-foot">
            <button className="btn-proceed" onClick={handleProceed}>
              Prosseguir
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function SidebarItem({ item, onUpdate, onRemove }) {
  const { quantity, price } = item;
  const total = price * quantity;

  return (
    <div className="cart-sidebar-item">
      <div className="cart-sidebar-item-row">
        <div className="cart-sidebar-item-img">
          {item.image_url && item.image_url.startsWith('http') ? (
            <img
              src={item.image_url}
              alt={item.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <span className="material-symbols-rounded" style={{ fontSize: 22, color: '#d1d5db' }}>
              shopping_basket
            </span>
          )}
        </div>
        <div className="cart-sidebar-item-info">
          <div className="cart-sidebar-item-name">{item.name}</div>
          <div className="cart-sidebar-item-sub">cada</div>
        </div>
        <div className="cart-sidebar-item-right">
          <div className="cart-sidebar-item-price">{formatCurrency(total)}</div>
          <span className="cart-sidebar-item-qty">{quantity}x</span>
        </div>
      </div>

      <div className="sidebar-qty-pill">
        <button
          className="sidebar-qty-btn"
          onClick={() =>
            quantity === 1 ? onRemove(item.id) : onUpdate(item.id, quantity - 1)
          }
          aria-label={quantity === 1 ? 'Remover item' : 'Diminuir quantidade'}
        >
          {quantity === 1 ? (
            <span className="material-symbols-rounded" style={{ fontSize: 15 }}>delete</span>
          ) : '−'}
        </button>
        <span className="sidebar-qty-num">{quantity}</span>
        <button
          className="sidebar-qty-btn"
          onClick={() => onUpdate(item.id, quantity + 1)}
        >
          +
        </button>
      </div>
    </div>
  );
}
