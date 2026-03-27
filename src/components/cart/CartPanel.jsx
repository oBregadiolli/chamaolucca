import { useCart } from '../../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { formatCurrency } from '../../lib/utils';
import Icon from '../ui/Icon';
import logobylucca from '../../assets/logobylucca.png';

export default function CartPanel({ onOpenAuth }) {
  const { items, isOpen, setIsOpen, updateQuantity, removeItem, subtotal, totalItems, syncFailure, dismissSyncFailure } = useCart();
  const { user } = useAuth();
  const { freeShippingActive, freeShippingAbove, shippingFee } = useStore();
  const navigate = useNavigate();

  if (!isOpen) return null;

  function handleProceed() {
    if (!user) {
      onOpenAuth();
      return;
    }
    setIsOpen(false);
    navigate('/checkout');
  }

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) setIsOpen(false);
  }

  return (
    <div className="cart-modal-overlay" onClick={handleBackdropClick}>
      <div className="cart-modal" role="dialog" aria-modal="true" aria-label="Sacola de compras">

        {/* ── Header ── */}
        <div className="cart-modal-header">
          <div className="cart-modal-header-logo">
            <img
              src={logobylucca}
              alt="ChamaoLucca"
              style={{ height: 32, width: 'auto', display: 'block' }}
            />
          </div>
          <div className="cart-modal-header-text">
            <p className="cart-modal-header-subtitle">Sacola no Lucca Mercado</p>
            <h2 className="cart-modal-header-title">
              Lista de compra
              {totalItems > 0 && (
                <span className="cart-modal-badge">{totalItems}</span>
              )}
            </h2>
          </div>
          <button
            className="cart-modal-close"
            onClick={() => setIsOpen(false)}
            aria-label="Fechar carrinho"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="cart-modal-body">

          {/* Banner: falha de sincronização */}
          {syncFailure && (
            <div style={{
              display:        'flex',
              alignItems:     'flex-start',
              gap:            10,
              background:     '#fef9c3',
              border:         '1px solid #fde047',
              borderRadius:   10,
              padding:        '10px 14px',
              margin:         '0 0 10px',
              fontSize:       '0.82rem',
              color:          '#854d0e',
              lineHeight:     1.4,
            }}>
              <Icon name="warning" size={16} fill style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }} />
              <span style={{ flex: 1 }}>
                Não foi possível sincronizar seu carrinho anterior. Verifique os itens abaixo.
              </span>
              <button
                onClick={dismissSyncFailure}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#92400e', flexShrink: 0 }}
                aria-label="Dispensar aviso"
              >
                <Icon name="close" size={14} />
              </button>
            </div>
          )}

          {items.length === 0 ? (
            <div className="cart-modal-empty">
              <div className="cart-modal-empty-icon">
                <Icon name="shopping_cart" size={52} style={{ color: '#d1d5db' }} />
              </div>
              <p className="cart-modal-empty-title">Sua sacola está vazia</p>
              <p className="cart-modal-empty-sub">Adicione produtos para começar</p>
              <button
                className="btn btn-secondary btn-sm"
                style={{ marginTop: '16px' }}
                onClick={() => setIsOpen(false)}
              >
                Voltar para a loja
              </button>
            </div>
          ) : (
            <>
              {/* Column labels */}
              <div className="cart-modal-cols">
                <span>Produtos</span>
                <span>Valor</span>
              </div>

              {/* Item list */}
              <ul className="cart-modal-list">
                {items.map((item) => (
                  <CartItem
                    key={item.id}
                    item={item}
                    onUpdate={updateQuantity}
                    onRemove={removeItem}
                  />
                ))}
              </ul>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        {items.length > 0 && (() => {
          const showNudge  = freeShippingActive && freeShippingAbove > 0 && subtotal < freeShippingAbove;
          const isFree     = freeShippingActive && freeShippingAbove > 0 && subtotal >= freeShippingAbove;
          const progress   = showNudge ? Math.min(100, (subtotal / freeShippingAbove) * 100) : 100;
          const remaining  = freeShippingAbove - subtotal;

          return (
            <div className="cart-modal-footer">
              {/* Free shipping nudge */}
              {showNudge && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontSize: '0.78rem', fontWeight: 600, marginBottom: 6,
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#374151' }}>
                      <span className="material-symbols-rounded" style={{ fontSize: 15, color: '#f59e0b' }}>local_shipping</span>
                      Falta <strong style={{ color: '#16a34a', margin: '0 3px' }}>{formatCurrency(remaining)}</strong> para frete grátis
                    </span>
                    <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>
                      {Math.round(progress)}%
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div style={{
                    height: 5, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${progress}%`,
                      background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                      borderRadius: 99,
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>
              )}

              {/* Free badge when reached */}
              {isFree && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
                  marginBottom: 10, padding: '7px 14px',
                  background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 99,
                  fontSize: '0.78rem', fontWeight: 700, color: '#15803d',
                }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 15 }}>local_shipping</span>
                  Frete grátis desbloqueado! 🎉
                </div>
              )}

              <div className="cart-modal-subtotal-bar">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span className="cart-modal-subtotal-label">Subtotal:</span>
                  {!isFree && shippingFee > 0 && (
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      + {formatCurrency(shippingFee)} frete
                    </span>
                  )}
                  {isFree && (
                    <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 700 }}>
                      Frete grátis incluído
                    </span>
                  )}
                </div>
                <span className="cart-modal-subtotal-value">{formatCurrency(subtotal)}</span>
              </div>
              <button className="cart-modal-proceed-btn" onClick={handleProceed}>
                {user ? 'Prosseguir' : 'Fazer login para continuar'}
              </button>
            </div>
          );
        })()}

      </div>
    </div>
  );
}

/* ── Individual cart item ── */
function CartItem({ item, onUpdate, onRemove }) {
  const itemTotal = item.price * item.quantity;

  const isUrl = item.image_url && item.image_url.startsWith('http');

  return (
    <li className="cart-modal-item">
      {/* Product image */}
      <div className="cart-modal-item-img">
        {isUrl ? (
          <img src={item.image_url} alt={item.name} />
        ) : (
          <span className="cart-modal-item-emoji">
            {item.image_url || <Icon name="inventory_2" size={28} style={{ color: '#94a3b8' }} />}
          </span>
        )}
      </div>

      {/* Middle: name + qty controls + actions */}
      <div className="cart-modal-item-info">
        <span className="cart-modal-item-qty-badge">{item.quantity}x</span>
        <p className="cart-modal-item-name">{item.name}</p>

        {/* Green qty pill */}
        <div className="cart-modal-qty-bar">
          <button
            className="cart-modal-qty-btn"
            onClick={() => onUpdate(item.id, item.quantity - 1)}
            aria-label="Diminuir quantidade"
          >
            −
          </button>
          <span className="cart-modal-qty-num">{item.quantity}</span>
          <button
            className="cart-modal-qty-btn"
            onClick={() => onUpdate(item.id, item.quantity + 1)}
            aria-label="Aumentar quantidade"
          >
            +
          </button>
        </div>

        {/* Editar / Remover */}
        <div className="cart-modal-item-actions">
          <button className="cart-modal-action-btn">
            Editar
          </button>
          <button
            className="cart-modal-action-btn cart-modal-action-remove"
            onClick={() => onRemove(item.id)}
          >
            Remover
          </button>
        </div>
      </div>

      {/* Right: item total */}
      <div className="cart-modal-item-total">
        {formatCurrency(itemTotal)}
      </div>
    </li>
  );
}
