import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../lib/utils';
import Icon from '../components/ui/Icon';

export default function ProductDetail() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { items, addItem, updateQuantity, removeItem } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');

  const cartItem = items.find((i) => i.id === productId);
  const qty = cartItem?.quantity || 0;

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(name, slug)')
        .eq('id', productId)
        .single();

      if (error || !data) {
        navigate('/loja', { replace: true });
        return;
      }
      setProduct(data);
      setLoading(false);
    }
    load();
  }, [productId, navigate]);

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="material-symbols-rounded" style={{ fontSize: 40, color: '#d1d5db', animation: 'spin 1s linear infinite' }}>refresh</span>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!product) return null;

  const isUrl = product.image_url && product.image_url.startsWith('http');

  function handleDecrease() {
    if (qty === 1) removeItem(product.id);
    else updateQuantity(product.id, qty - 1);
  }

  function handleIncrease() {
    if (qty === 0) addItem({ ...product, note: note.trim() || undefined });
    else updateQuantity(product.id, qty + 1);
  }

  return (
    <div style={{
      maxWidth: 900,
      margin: '0 auto',
      padding: '24px 16px 60px',
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#6b7280', marginBottom: 24, flexWrap: 'wrap' }}>
        <Link to="/loja" style={{ color: '#16a34a', textDecoration: 'none', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Icon name="chevron_left" size={16} />
          Voltar ao início
        </Link>
        <span>›</span>
        {product.categories && (
          <>
            <Link
              to={`/loja#cat-${product.categories.slug}`}
              style={{ color: '#16a34a', textDecoration: 'none', fontWeight: 500 }}
            >
              Categorias
            </Link>
            <span>›</span>
          </>
        )}
        <span style={{ color: '#374151', fontWeight: 500 }}>{product.name}</span>
      </nav>

      {/* Card */}
      <div style={{
        background: '#fff',
        borderRadius: 20,
        border: '1px solid #e5e7eb',
        padding: '32px 28px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 40,
        boxShadow: '0 2px 16px rgba(0,0,0,0.04)',
      }}
        className="pd-grid"
      >
        {/* Left — image */}
        <div style={{
          background: '#f9fafb',
          borderRadius: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 260,
          overflow: 'hidden',
        }}>
          {isUrl ? (
            <img
              src={product.image_url}
              alt={product.name}
              style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: 320, padding: 16 }}
            />
          ) : (
            <span className="material-symbols-rounded" style={{ fontSize: 72, color: '#d1d5db' }}>shopping_basket</span>
          )}
        </div>

        {/* Right — info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Category tag */}
          {product.categories && (
            <Link
              to={`/loja#cat-${product.categories.slug}`}
              style={{
                alignSelf: 'flex-start',
                background: '#f0fdf4',
                color: '#16a34a',
                fontSize: '0.7rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                padding: '5px 10px',
                borderRadius: 99,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Icon name="chevron_left" size={14} />
              Ver categorias
            </Link>
          )}

          {/* Name */}
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#111', lineHeight: 1.2 }}>
            {product.name}
          </h1>

          {/* Price */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a' }}>
              {formatCurrency(product.price)}
            </span>
            {product.compare_price && product.compare_price > product.price && (
              <span style={{ fontSize: '1rem', color: '#9ca3af', textDecoration: 'line-through' }}>
                {formatCurrency(product.compare_price)}
              </span>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <div style={{
              border: '1px solid #e5e7eb',
              borderRadius: 10,
              padding: '12px 14px',
            }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>Descrição</div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280', lineHeight: 1.55 }}>
                {product.description}
              </p>
            </div>
          )}

          {/* Qty control */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: '#16a34a',
            borderRadius: 99,
            overflow: 'hidden',
            width: 'fit-content',
          }}>
            <button
              onClick={handleDecrease}
              disabled={qty === 0}
              style={{
                background: 'none',
                border: 'none',
                color: '#fff',
                width: 44,
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: qty === 0 ? 'not-allowed' : 'pointer',
                fontSize: '1.1rem',
                opacity: qty === 0 ? 0.5 : 1,
              }}
              aria-label="Diminuir"
            >
              {qty <= 1
                ? <span className="material-symbols-rounded" style={{ fontSize: 18, color: '#fff' }}>delete</span>
                : '−'}
            </button>
            <span style={{
              minWidth: 36,
              textAlign: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: '1rem',
            }}>
              {qty}
            </span>
            <button
              onClick={handleIncrease}
              style={{
                background: 'none',
                border: 'none',
                color: '#fff',
                width: 44,
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '1.25rem',
                fontWeight: 700,
              }}
              aria-label="Aumentar"
            >
              +
            </button>
          </div>

          {/* Note */}
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
              Alguma observação?
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: Apertar os limões para saber se tem muito suco."
              rows={3}
              style={{
                width: '100%',
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                padding: '10px 12px',
                fontSize: '0.85rem',
                color: '#374151',
                fontFamily: 'inherit',
                resize: 'none',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => { e.target.style.borderColor = '#16a34a'; }}
              onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; }}
            />
          </div>
        </div>
      </div>

      {/* Responsive style */}
      <style>{`
        @media (max-width: 640px) {
          .pd-grid {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
            padding: 20px 16px !important;
          }
        }
      `}</style>
    </div>
  );
}
