import { useCart } from '../../context/CartContext';
import { useStore } from '../../context/StoreContext';
import { formatCurrency } from '../../lib/utils';

/**
 * FreeShippingBanner — progresso/desbloqueio de frete grátis.
 * Fonte única de verdade: usado no checkout e no carrinho.
 *
 * Props:
 *  - variant: 'banner' (checkout, padrão) | 'compact' (carrinho)
 *  - onGoToStore: callback do CTA "Comprar mais" (só no variant banner)
 */
export default function FreeShippingBanner({ variant = 'banner', onGoToStore }) {
  const { subtotal, promotionDiscount, promotionSubtotal } = useCart();
  const { freeShippingActive, freeShippingAbove, shippingFee } = useStore();

  // Não mostra se frete grátis desativado ou sem limite configurado
  if (!freeShippingActive || !freeShippingAbove || freeShippingAbove <= 0) return null;

  const subtotalForShipping = promotionDiscount > 0 ? promotionSubtotal : subtotal;
  const isFree    = subtotalForShipping >= freeShippingAbove;
  const remaining = Math.max(0, freeShippingAbove - subtotalForShipping);
  const progress  = Math.min(100, (subtotalForShipping / freeShippingAbove) * 100);

  /* ── Variante compacta (carrinho) ── */
  if (variant === 'compact') {
    return (
      <div className="fs-compact" data-free={isFree || undefined}>
        {isFree ? (
          <div className="fs-compact-pill">
            <span className="material-symbols-rounded fs-compact-icon" aria-hidden="true">local_shipping</span>
            Frete grátis desbloqueado!
            <span className="material-symbols-rounded fs-compact-icon" aria-hidden="true">celebration</span>
          </div>
        ) : (
          <>
            <div className="fs-compact-row">
              <span className="fs-compact-label">
                <span className="material-symbols-rounded fs-compact-icon fs-compact-icon--accent" aria-hidden="true">local_shipping</span>
                Falta <strong>{formatCurrency(remaining)}</strong> para frete grátis
              </span>
              <span className="fs-compact-pct">{Math.round(progress)}%</span>
            </div>
            <div className="fs-compact-track">
              <div className="fs-compact-fill" style={{ width: `${progress}%` }} />
            </div>
          </>
        )}
      </div>
    );
  }

  /* ── Variante banner (checkout) ── */
  return (
    <div className="fs-banner" data-free={isFree || undefined}>
      {/* Progress bar */}
      <div className="fs-banner-progress">
        <div className="fs-banner-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="fs-banner-content">
        {/* Icon */}
        <div className="fs-banner-icon-wrap">
          <span className="material-symbols-rounded fs-banner-icon" aria-hidden="true">
            {isFree ? 'check_circle' : 'local_shipping'}
          </span>
        </div>

        {/* Text */}
        <div className="fs-banner-text">
          {isFree ? (
            <>
              <span className="fs-banner-title fs-banner-title--free">
                <span className="material-symbols-rounded fs-banner-title-icon" aria-hidden="true">celebration</span>
                Você ganhou frete grátis!
              </span>
              <span className="fs-banner-sub">
                Economize <strong>{formatCurrency(shippingFee)}</strong> neste pedido
              </span>
            </>
          ) : (
            <>
              <span className="fs-banner-title">
                Faltam <strong>{formatCurrency(remaining)}</strong> para frete grátis
              </span>
              <span className="fs-banner-sub">
                Adicione mais itens e economize no frete!
              </span>
            </>
          )}
        </div>

        {/* CTA */}
        {!isFree && onGoToStore && (
          <button type="button" className="fs-banner-cta" onClick={onGoToStore}>
            <span className="material-symbols-rounded" style={{ fontSize: 16 }} aria-hidden="true">add_shopping_cart</span>
            Comprar mais
          </button>
        )}
      </div>
    </div>
  );
}
