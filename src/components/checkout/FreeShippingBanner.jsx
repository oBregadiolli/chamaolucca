import { useCart } from '../../context/CartContext';
import { useStore } from '../../context/StoreContext';

function formatCurrency(v) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * FreeShippingBanner — card motivacional de frete grátis.
 * Exibe barra de progresso + valor faltante + CTA para voltar à loja.
 *
 * Props:
 *  - onGoToStore: callback para voltar à loja / abrir carrinho
 */
export default function FreeShippingBanner({ onGoToStore }) {
  const { subtotal } = useCart();
  const { freeShippingActive, freeShippingAbove, shippingFee } = useStore();

  // Não mostra se frete grátis desativado ou sem limite configurado
  if (!freeShippingActive || !freeShippingAbove || freeShippingAbove <= 0) return null;

  const isFree     = subtotal >= freeShippingAbove;
  const remaining  = Math.max(0, freeShippingAbove - subtotal);
  const progress   = Math.min(100, (subtotal / freeShippingAbove) * 100);

  return (
    <div className="fs-banner" data-free={isFree || undefined}>
      {/* Progress bar */}
      <div className="fs-banner-progress">
        <div className="fs-banner-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="fs-banner-content">
        {/* Icon */}
        <div className="fs-banner-icon-wrap">
          <span className="material-symbols-rounded fs-banner-icon">
            {isFree ? 'check_circle' : 'local_shipping'}
          </span>
        </div>

        {/* Text */}
        <div className="fs-banner-text">
          {isFree ? (
            <>
              <span className="fs-banner-title fs-banner-title--free">
                🎉 Você ganhou frete grátis!
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
          <button
            type="button"
            className="fs-banner-cta"
            onClick={onGoToStore}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 16 }}>add_shopping_cart</span>
            Comprar mais
          </button>
        )}
      </div>
    </div>
  );
}
