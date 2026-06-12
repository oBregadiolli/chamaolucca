import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { formatCurrency } from '../../lib/utils';
import Icon from '../ui/Icon';

export default function ProductCard({ product }) {
  const { items, addItem, updateQuantity, removeItem } = useCart();
  const cartItem = items.find((i) => i.id === product.id);
  const qty = cartItem?.quantity || 0;

  const isUrl = product.image_url && product.image_url.startsWith('http');

  return (
    <div className="product-card-store">
      {/* Clickable area: image + name → product detail */}
      <Link
        to={`/item/${product.id}`}
        style={{ cursor: 'pointer', flex: 1, display: 'flex', flexDirection: 'column', textDecoration: 'none', color: 'inherit' }}
        aria-label={`Ver detalhes de ${product.name}`}
      >
        <div className="product-card-img">
          {isUrl ? (
            <img
              src={product.image_url}
              alt={product.name}
              width={400}
              height={200}
              loading="lazy"
              decoding="async"
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <span
            className="material-symbols-rounded"
            style={{
              display: isUrl ? 'none' : 'flex',
              fontSize: 36,
              color: '#d1d5db',
            }}
          >
            shopping_basket
          </span>
        </div>

        <div className="product-card-brand">
          {product.categories?.name || ''}
        </div>

        <div className="product-card-name">{product.name}</div>
      </Link>

      <div className="product-card-price">
        {formatCurrency(product.price)} cada
      </div>

      {product.compare_price && product.compare_price > product.price && (
        <div className="product-card-compare">
          {formatCurrency(product.compare_price)}
        </div>
      )}

      {qty === 0 ? (
        <button
          className="product-add-dark"
          onClick={() => addItem(product)}
          aria-label={`Adicionar ${product.name}`}
        >
          <Icon name="add_shopping_cart" size={20} />
        </button>
      ) : (
        <div className="product-qty-pill">
          <button
            className="qty-pill-btn"
            onClick={() =>
              qty === 1 ? removeItem(product.id) : updateQuantity(product.id, qty - 1)
            }
            aria-label="Diminuir"
          >
            {qty === 1
              ? <Icon name="delete" size={16} style={{ color: '#fff' }} />
              : '−'}
          </button>
          <span className="qty-pill-num">{qty}</span>
          <button
            className="qty-pill-btn"
            onClick={() => updateQuantity(product.id, qty + 1)}
            aria-label="Aumentar"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}
