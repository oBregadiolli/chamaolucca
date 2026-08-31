import { useState, useMemo } from 'react';
import { useCheckout } from '../../context/CheckoutContext';
import { useCart } from '../../context/CartContext';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../lib/utils';
import { validateCoupon } from '../../admin/services/adminCoupons';
import Icon from '../ui/Icon';
import PromotionMessages from '../cart/PromotionMessages';

function BasketIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"
        stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="3" y1="6" x2="21" y2="6" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 10a4 4 0 01-8 0" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
  );
}

/**
 * ReviewStep — Revisão do pedido antes do pagamento.
 * onPlaceOrder(discount, shipping, couponCode, couponId) → passado ao Checkout.jsx
 */
export default function ReviewStep({ onPlaceOrder, saving }) {
  const { prevStep, deliveryMode } = useCheckout();
  const {
    cartItems,
    subtotal,
    promotionDiscount,
    promotionSubtotal,
    promotionRewards,
    promotionNudges,
  } = useCart();
  const { calcShipping, freeShippingAbove, freeShippingActive } = useStore();
  const { user } = useAuth();

  const [couponInput,  setCouponInput]  = useState('');
  const [couponMsg,    setCouponMsg]    = useState(null); // { text, type: 'success'|'error' }
  const [discount,     setDiscount]     = useState(0);
  const [couponData,   setCouponData]   = useState(null); // full coupon row
  const [validating,   setValidating]   = useState(false);
  const [testMode,     setTestMode]     = useState(false);

  const isLocal = useMemo(() => {
    const h = window.location.hostname;
    return h === 'localhost' || h === '127.0.0.1';
  }, []);

  const subtotalAfterPromotions = promotionDiscount > 0 ? promotionSubtotal : subtotal;
  const shipping = calcShipping(subtotalAfterPromotions - discount);
  const total    = Math.max(0, subtotalAfterPromotions - discount + shipping);

  const isFreeShipping = shipping === 0;
  const nearFreeShipping =
    freeShippingActive &&
    freeShippingAbove > 0 &&
    !isFreeShipping &&
    subtotalAfterPromotions < freeShippingAbove;
  const amountToFreeShipping = freeShippingAbove - subtotalAfterPromotions;

  async function handleApplyCoupon() {
    const code = couponInput.trim();
    if (!code) return;
    if (couponData?.code === code.toUpperCase()) return; // already applied

    setValidating(true);
    setCouponMsg(null);

    const result = await validateCoupon(code, subtotalAfterPromotions, user?.id);

    if (!result.valid) {
      setDiscount(0);
      setCouponData(null);
      setCouponMsg({ text: result.reason, type: 'error' });
    } else {
      setDiscount(result.discountAmount);
      setCouponData(result.coupon);
      setCouponMsg({
        text: `Cupom aplicado! ${result.discountLabel}`,
        type: 'success',
      });
    }
    setValidating(false);
  }

  function handleRemoveCoupon() {
    setDiscount(0);
    setCouponData(null);
    setCouponInput('');
    setCouponMsg(null);
  }

  return (
    <div className="co-step-wrapper">
      <div className="co-card">
        {/* Header */}
        <div className="co-card-header">
          <BasketIcon />
          <h1 className="co-card-title">Revisão do pedido</h1>
        </div>

        {/* Column labels */}
        <div className="rv-col-labels">
          <span>Produtos</span>
          <span>Valor</span>
        </div>

        {/* Items list */}
        <ul className="rv-items-list">
          {cartItems.map((item) => (
            <li key={item.id} className={`rv-item${item.isPromotionGift ? ' rv-item--gift' : ''}`}>
              <div className="rv-item-thumb" aria-hidden="true">
                {item.image_url ? (
                  <>
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="rv-thumb-img"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextSibling.style.display = 'flex';
                      }}
                    />
                    <span className="rv-thumb-emoji" style={{ display: 'none' }}>
                      <Icon name="shopping_basket" size={22} style={{ color: '#d1d5db' }} />
                    </span>
                  </>
                ) : (
                  <span className="rv-thumb-emoji">
                    <Icon name="shopping_basket" size={22} style={{ color: '#d1d5db' }} />
                  </span>
                )}
              </div>
              <span className="rv-item-name">
                <strong>{item.quantity}x</strong> {item.name}
                {item.isPromotionGift && (
                  <span className="rv-gift-badge">
                    <Icon name="redeem" size={13} />
                    Brinde automático
                  </span>
                )}
              </span>
              <span className="rv-item-price">
                {item.isPromotionGift ? 'Grátis' : formatCurrency(item.price * item.quantity)}
              </span>
            </li>
          ))}
        </ul>

        {/* Free shipping nudge */}
        {nearFreeShipping && (
          <div className="rv-fs-nudge">
            <span className="material-symbols-rounded rv-fs-nudge-icon" style={{ fontSize: 18 }} aria-hidden="true">local_shipping</span>
            Falta <strong>{formatCurrency(amountToFreeShipping)}</strong> para frete grátis!
          </div>
        )}

        <PromotionMessages rewards={promotionRewards} nudges={promotionNudges} />

        {/* Coupon */}
        <div className="rv-coupon-label">Tem um cupom de desconto?</div>
        {couponData ? (
          /* Applied state */
          <div className="rv-coupon-applied">
            <div className="rv-coupon-applied-info">
              <span className="material-symbols-rounded rv-coupon-applied-icon" style={{ fontSize: 18 }} aria-hidden="true">confirmation_number</span>
              <div>
                <span className="rv-coupon-applied-code">{couponData.code}</span>
                <span className="rv-coupon-applied-note">{couponMsg?.text}</span>
              </div>
            </div>
            <button
              type="button"
              className="rv-coupon-remove"
              onClick={handleRemoveCoupon}
              aria-label="Remover cupom"
              title="Remover cupom"
            >
              <span className="material-symbols-rounded" style={{ fontSize: 18 }} aria-hidden="true">close</span>
            </button>
          </div>
        ) : (
          /* Input state */
          <>
            <div className="rv-coupon-row">
              <input
                className="rv-coupon-input"
                type="text"
                placeholder="Digite o código do cupom"
                value={couponInput}
                onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponMsg(null); }}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                disabled={validating}
                style={{ textTransform: 'uppercase' }}
              />
              <button
                className="rv-coupon-btn"
                type="button"
                onClick={handleApplyCoupon}
                disabled={!couponInput.trim() || validating}
              >
                {validating ? (
                  <span className="material-symbols-rounded" style={{ fontSize: 16, animation: 'spin 1s linear infinite' }}>
                    progress_activity
                  </span>
                ) : 'Aplicar'}
              </button>
            </div>
            {couponMsg && (
              <p className={`rv-coupon-inline-msg ${couponMsg.type === 'success' ? 'is-success' : 'is-error'}`}>
                <span className="material-symbols-rounded" style={{ fontSize: 15 }} aria-hidden="true">
                  {couponMsg.type === 'success' ? 'check_circle' : 'error_outline'}
                </span>
                {couponMsg.text}
              </p>
            )}
          </>
        )}

        {/* Totals */}
        <div className="rv-totals">
          <div className="rv-totals-row">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>

          {promotionDiscount > 0 && (
            <div className="rv-totals-row discount">
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icon name="sell" size={14} />
                Promoções
              </span>
              <span>−{formatCurrency(promotionDiscount)}</span>
            </div>
          )}

          {discount > 0 && (
            <div className="rv-totals-row discount">
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icon name="confirmation_number" size={14} />
                Cupom {couponData?.code}
              </span>
              <span>−{formatCurrency(discount)}</span>
            </div>
          )}

          <div className="rv-totals-row">
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon name="local_shipping" size={14} />
              Frete
              {isFreeShipping && (
                <span style={{
                  fontSize: '0.7rem', fontWeight: 700,
                  background: '#dcfce7', color: '#15803d',
                  borderRadius: 99, padding: '1px 7px',
                }}>
                  GRÁTIS
                </span>
              )}
            </span>
            <span style={{ color: isFreeShipping ? '#16a34a' : undefined }}>
              {isFreeShipping ? 'Grátis' : formatCurrency(shipping)}
            </span>
          </div>

          {deliveryMode === 'express' && (
            <div className="rv-totals-row" style={{ color: '#f59e0b' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icon name="bolt" size={14} />
                Entrega Rápida
              </span>
              <span style={{ fontSize: '0.78rem' }}>até 10 min</span>
            </div>
          )}

          <div className="rv-totals-row total">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Dev test toggle — localhost only */}
        {isLocal && (
          <div className="rv-test" data-on={testMode}>
            <span className="rv-test-label">
              <span className="material-symbols-rounded" style={{ fontSize: 15 }} aria-hidden="true">science</span>
              TESTE
            </span>
            <button
              type="button"
              className="rv-test-switch"
              onClick={() => setTestMode(!testMode)}
              aria-label={testMode ? 'Desativar modo teste' : 'Ativar modo teste'}
              aria-pressed={testMode}
            >
              <span className="rv-test-thumb" />
            </button>
            <span className="rv-test-hint">
              {testMode ? 'Pula MP, marca como pago' : 'Pagamento real'}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="co-actions">
          <button
            className="co-back-btn rv-back"
            onClick={prevStep}
            type="button"
            aria-label="Voltar"
          >
            <ArrowLeftIcon />
          </button>
          <button
            className="co-advance-btn"
            onClick={() => onPlaceOrder({
              discount,
              shipping,
              couponCode: couponData?.code ?? null,
              couponId:   couponData?.id   ?? null,
              testMode,
            })}
            disabled={saving}
            type="button"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
          >
            {saving ? (
              <>
                <span style={{
                  width: 16, height: 16,
                  border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff',
                  borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                  display: 'inline-block', flexShrink: 0,
                }} />
                Redirecionando…
              </>
            ) : (
              <>
                <span className="material-symbols-rounded rv-pay-icon" aria-hidden="true">
                  {deliveryMode === 'express' ? 'bolt' : 'payment'}
                </span>
                {deliveryMode === 'express' ? 'Pagar Agora' : 'Ir para Pagamento'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
