import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';
import { formatCurrency } from '../lib/utils';
import ProductCard from '../components/store/ProductCard';
import CartSidebar from '../components/store/CartSidebar';
import Icon from '../components/ui/Icon';
import { usePageTitle } from '../hooks/usePageTitle';
import '../styles/store.css';

export default function Store({ onOpenAuth }) {
  usePageTitle('Loja — ChamaoLucca');
  const { openTime, closeTime, isOpen } = useStore();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const hoursLabel = `${openTime} — ${closeTime}`;

  useEffect(() => {
    async function load() {
      const [catRes, prodRes] = await Promise.all([
        supabase
          .from('categories')
          .select('*')
          .eq('active', true)
          .order('sort_order'),
        supabase
          .from('products')
          .select('*, categories(name, slug)')
          .eq('active', true),
      ]);
      setCategories(catRes.data || []);
      setProducts(prodRes.data || []);
      setLoading(false);
    }
    load();
  }, []);

  const grouped = categories
    .map((cat) => ({
      ...cat,
      products: products.filter((p) => p.category_id === cat.id),
    }))
    .filter((g) => g.products.length > 0);

  // Show only products marked as featured in the admin panel
  const featuredForCombo = products.filter((p) => p.featured);

  return (
    <div className="store-wrapper">
      {/* ── Main content ── */}
      <div className="store-main">
        {/* Hero */}
        <div className="store-hero">
          <div>
            <h1 className="store-headline">Nada de filas ッ</h1>
            <p className="store-subtitle">
              <Icon name="location_on" size={16} fill style={{ color: '#16a34a' }} /> Shopper • Alagoinhas{' '}
              {products.length > 0 && `(+${products.length} itens)`}
            </p>
            <div className="store-status-row">
              <span className="status-tag-menu">
                {isOpen ? 'Menu Disponível' : 'Menu indisponível'}
              </span>
              <span className={isOpen ? 'status-tag-open' : 'status-tag-closed'}>
                {isOpen ? `Aberto ${hoursLabel}` : `Fechado · Abrimos ${openTime}`}
              </span>
            </div>
          </div>

        </div>

        {/* Seleção da Velocidade */}
        {featuredForCombo.length > 0 && (
          <section className="store-section">
            <h2 className="store-section-title">Seleção da Velocidade</h2>
            <div className="combo-scroll">
              <ComboCard products={featuredForCombo} />
            </div>
          </section>
        )}

        {/* Product sections by category */}
        {loading ? (
          <div style={{ padding: '20px 0' }}>
            {/* Skeleton cards */}
            {[1, 2, 3].map((i) => (
              <section key={i} className="store-section">
                <div style={{ width: 140, height: 20, background: '#f1f5f9', borderRadius: 8, marginBottom: 14 }} />
                <div className="products-grid-store">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} style={{
                      background: '#fff', borderRadius: 14, padding: 16,
                      border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: 10,
                    }}>
                      <div style={{ width: '100%', height: 100, background: '#f8fafc', borderRadius: 10, animation: 'pulse 1.5s ease-in-out infinite' }} />
                      <div style={{ width: '70%', height: 14, background: '#f1f5f9', borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
                      <div style={{ width: '40%', height: 12, background: '#f1f5f9', borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
                    </div>
                  ))}
                </div>
              </section>
            ))}
            <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
          </div>
        ) : grouped.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 20px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          }}>
            <Icon name="storefront" size={48} style={{ color: '#d1d5db' }} />
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#374151', fontWeight: 700 }}>
              Nenhum produto disponível no momento
            </h3>
            <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.9rem', maxWidth: 300 }}>
              Estamos atualizando nosso catálogo. Volte em breve para conferir as novidades!
            </p>
          </div>
        ) : (
          grouped.map((cat) => (
            <section
              key={cat.id}
              className="store-section"
              id={`cat-${cat.slug}`}
            >
              <h2 className="store-section-title">{cat.name}</h2>
              <div className="products-grid-store">
                {cat.products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      {/* ── Sidebar cart (desktop) ── */}
      <aside className="store-sidebar">
        <CartSidebar onOpenAuth={onOpenAuth} />
      </aside>
    </div>
  );
}

/* Combo card showing 4 featured products */
function ComboCard({ products }) {
  const { addItem } = useCart();
  const combo = products.slice(0, 4);
  const total = combo.reduce((s, p) => s + parseFloat(p.price), 0);
  const names = combo
    .map((p) => p.name.split(' ').slice(0, 3).join(' '))
    .join(', ');

  return (
    <div className="combo-card">
      <div className="combo-label">COMBO PENSADO EM VOCÊ</div>
      <div className="combo-emojis">
        {combo.map((p) => (
          p.image_url && p.image_url.startsWith('http') ? (
            <img
              key={p.id}
              src={p.image_url}
              alt={p.name}
              width={36}
              height={36}
              loading="lazy"
              decoding="async"
              style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6 }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <span key={p.id} className="material-symbols-rounded" style={{ fontSize: 24, color: '#9ca3af' }}>
              shopping_basket
            </span>
          )
        ))}
      </div>
      <div className="combo-name">{names}</div>
      <div className="combo-price">{formatCurrency(total)} cada</div>
      <button
        type="button"
        className="product-add-dark"
        onClick={() => combo.forEach((p) => addItem(p))}
        aria-label={`Adicionar combo ao carrinho: ${names}`}
      >
        <Icon name="shopping_cart" size={22} fill />
      </button>
    </div>
  );
}
