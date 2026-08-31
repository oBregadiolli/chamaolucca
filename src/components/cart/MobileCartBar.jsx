import { useCart } from '../../context/CartContext';
import { useLocation } from 'react-router-dom';
import { formatCurrency } from '../../lib/utils';
import Icon from '../ui/Icon';

/**
 * Sticky bottom cart bar — mobile only (hidden on ≥ 768px via CSS).
 * Hidden when the cart modal is already open to avoid overlap.
 */
export default function MobileCartBar() {
  const { subtotal, promotionDiscount, promotionSubtotal, totalItems, setIsOpen, isOpen } = useCart();
  const location = useLocation();

  const isCheckout = location.pathname.startsWith('/checkout');
  const isHome     = location.pathname === '/';
  const isAdmin    = location.pathname.startsWith('/admin');
  const isOrder    = location.pathname.startsWith('/pedido');

  // Hide on home, checkout, admin, order pages, when cart is empty, or when cart modal is open
  if (isHome || isCheckout || isAdmin || isOrder || totalItems === 0 || isOpen) return null;

  return (
    <div className="mobile-cart-bar" role="complementary" aria-label="Resumo do carrinho">
      <button
        className="mobile-cart-bar-inner"
        onClick={() => setIsOpen(true)}
        aria-label="Ver sacola"
      >
        <span className="mobile-cart-bar-badge">{totalItems}</span>
        <span className="mobile-cart-bar-text">Ver sacola</span>
        <span className="mobile-cart-bar-total">
          {formatCurrency(promotionDiscount > 0 ? promotionSubtotal : subtotal)}
        </span>
      </button>
    </div>
  );
}
