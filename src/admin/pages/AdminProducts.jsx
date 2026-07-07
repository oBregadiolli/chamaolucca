import { useEffect, useRef, useState } from 'react';
import {
  fetchAllProducts,
  createProduct,
  updateProduct,
  toggleProductActive,
} from '../services/adminProducts';
import { fetchAllCategories } from '../services/adminCategories';
import Icon from '../../components/ui/Icon';
import { supabase } from '../../lib/supabase';

// ─── Constants ────────────────────────────────────────────────
const EMPTY_PRODUCT = {
  name: '',
  description: '',
  price: '',
  promotional_price: '',
  image_url: '',
  category_id: '',
  unit: 'un',
  active: true,
  featured: false,
  stock: '',
};

const UNITS = [
  { value: 'un', label: 'Unidade (un)' },
  { value: 'kg', label: 'Quilograma (kg)' },
  { value: 'g',  label: 'Grama (g)' },
  { value: 'caixa', label: 'Caixa' },
  { value: 'dz', label: 'Dúzia (dz)' },
  { value: 'pct', label: 'Pacote (pct)' },
  { value: 'sc', label: 'Saco (sc)' },
];

// ─── Helpers ─────────────────────────────────────────────────
function formatCurrency(value) {
  return Number(value ?? 0).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL',
  });
}

function Toast({ msg, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  return <div className={`admin-toast admin-toast--${type}`}><Icon name={type === 'success' ? 'check' : 'close'} size={16} /> {msg}</div>;
}

function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="admin-confirm-overlay" onClick={onCancel}>
      <div className="admin-confirm-box" onClick={(e) => e.stopPropagation()}>
        <p className="admin-confirm-msg">{message}</p>
        <div className="admin-confirm-actions">
          <button className="admin-btn admin-btn--ghost" onClick={onCancel}>Cancelar</button>
          <button className="admin-btn admin-btn--danger" onClick={onConfirm}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}

function FieldError({ msg }) {
  if (!msg) return null;
  return <span className="admin-field-error">{msg}</span>;
}

// ─── Product Form Modal ───────────────────────────────────────
function ProductForm({ product, categories, onSave, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY_PRODUCT, ...(product ?? {}) });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [globalError, setGlobalError] = useState(null);
  const [imgError, setImgError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const nameRef = useRef(null);

  useEffect(() => {
    setTimeout(() => nameRef.current?.focus(), 60);
  }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onCancel(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  }

  function validate() {
    const errs = {};
    if (!(form.name ?? '').trim()) errs.name = 'Nome é obrigatório.';
    if (!form.price || Number(form.price) <= 0) errs.price = 'Informe um preço válido.';
    if (form.promotional_price && Number(form.promotional_price) >= Number(form.price)) {
      errs.promotional_price = 'Deve ser menor que o preço normal.';
    }
    return errs;
  }

  async function handleImageUpload(file) {
    setUploadError(null);

    // Validate type
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      setUploadError('Formato não suportado. Use JPG, PNG, WebP ou GIF.');
      return;
    }

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Imagem muito grande. Máximo 5 MB.');
      return;
    }

    setUploading(true);
    try {
      // Delete previous image from Storage (if it's from our own bucket)
      const prevUrl = form.image_url;
      if (prevUrl && prevUrl.includes('/product-images/')) {
        const marker = '/product-images/';
        const oldPath = prevUrl.slice(prevUrl.indexOf(marker) + marker.length);
        if (oldPath) {
          await supabase.storage.from('product-images').remove([oldPath]).catch(() => {});
        }
      }

      // Generate unique filename
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      const filePath = `products/${timestamp}-${randomId}.${ext}`;

      // Upload to Supabase Storage
      const { error: uploadErr } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadErr) throw uploadErr;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) throw new Error('Não foi possível obter a URL pública.');

      set('image_url', publicUrl);
      setImgError(false);
    } catch (err) {
      console.error('[Upload] error:', err);
      setUploadError(err.message || 'Erro ao enviar imagem. Tente novamente.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setSaving(true);
    setGlobalError(null);
    try {
      const payload = {
        name: (form.name ?? '').trim(),
        description: (form.description ?? '').trim() || null,
        price: Number(form.price),
        promotional_price: form.promotional_price ? Number(form.promotional_price) : null,
        image_url: (form.image_url ?? '').trim() || null,
        category_id: form.category_id || null,
        unit: form.unit || 'un',
        active: form.active,
        featured: form.featured,
        stock: form.stock ? Number(form.stock) : null,
      };
      const saved = form.id
        ? await updateProduct(form.id, payload)
        : await createProduct(payload);
      onSave(saved);
    } catch (err) {
      setGlobalError(err.message ?? 'Erro ao salvar produto. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  const hasPromo = form.promotional_price && Number(form.promotional_price) > 0;
  const discount = hasPromo
    ? Math.round((1 - Number(form.promotional_price) / Number(form.price)) * 100)
    : 0;

  return (
    <div className="admin-modal-overlay" onClick={onCancel}>
      <div className="admin-modal admin-modal--lg" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div>
            <h2 className="admin-modal-title">
              {form.id ? `Editar: ${form.name || 'Produto'}` : 'Novo Produto'}
            </h2>
            {form.id && (
              <p className="admin-modal-sub">ID: {form.id.slice(0, 8)}…</p>
            )}
          </div>
          <button className="admin-modal-close" onClick={onCancel}>
            <Icon name="close" size={20} />
          </button>
        </div>

        <form className="admin-modal-body" onSubmit={handleSubmit} noValidate>
          {globalError && (
            <div className="admin-feedback admin-feedback--error admin-feedback--banner">
              <Icon name="warning" size={16} /> {globalError}
            </div>
          )}

          {/* Row 1: name */}
          <div className="admin-form-section">
            <div className="admin-form-group admin-form-group--full">
              <label className="admin-form-label">
                Nome do produto <span className="admin-form-required">*</span>
              </label>
              <input
                ref={nameRef}
                className={`admin-form-input ${errors.name ? 'admin-form-input--error' : ''}`}
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Ex: Laranja Bahia, Maçã Fuji…"
              />
              <FieldError msg={errors.name} />
            </div>
          </div>

          {/* Row 2: category + unit */}
          <div className="admin-form-section admin-form-row">
            <div className="admin-form-group">
              <label className="admin-form-label">Categoria</label>
              <select
                className="admin-form-input"
                value={form.category_id}
                onChange={(e) => set('category_id', e.target.value)}
              >
                <option value="">— Sem categoria —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="admin-form-group">
              <label className="admin-form-label">Unidade de venda</label>
              <select
                className="admin-form-input"
                value={form.unit}
                onChange={(e) => set('unit', e.target.value)}
              >
                {UNITS.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: prices + stock */}
          <div className="admin-form-section admin-form-row">
            <div className="admin-form-group">
              <label className="admin-form-label">
                Preço (R$) <span className="admin-form-required">*</span>
              </label>
              <input
                className={`admin-form-input ${errors.price ? 'admin-form-input--error' : ''}`}
                type="number"
                step="0.01"
                min="0.01"
                value={form.price}
                onChange={(e) => set('price', e.target.value)}
                placeholder="0,00"
              />
              <FieldError msg={errors.price} />
            </div>
            <div className="admin-form-group">
              <label className="admin-form-label">
                Preço promocional (R$)
                {hasPromo && discount > 0 && (
                  <span className="admin-discount-pill">−{discount}%</span>
                )}
              </label>
              <input
                className={`admin-form-input ${errors.promotional_price ? 'admin-form-input--error' : ''}`}
                type="number"
                step="0.01"
                min="0"
                value={form.promotional_price}
                onChange={(e) => set('promotional_price', e.target.value)}
                placeholder="Opcional"
              />
              <FieldError msg={errors.promotional_price} />
            </div>
            <div className="admin-form-group">
              <label className="admin-form-label">Estoque</label>
              <input
                className="admin-form-input"
                type="number"
                min="0"
                value={form.stock}
                onChange={(e) => set('stock', e.target.value)}
                placeholder="Opcional"
              />
            </div>
          </div>

          {/* Row 4: image upload */}
          <div className="admin-form-section">
            <div className="admin-form-group admin-form-group--full">
              <label className="admin-form-label">Imagem do produto</label>

              {/* Preview area */}
              {form.image_url && !imgError ? (
                <div style={{
                  position: 'relative',
                  marginBottom: 12,
                  borderRadius: 12,
                  overflow: 'hidden',
                  border: '1.5px solid #e2e8f0',
                  background: '#f8fafc',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  maxHeight: 200,
                }}>
                  <img
                    src={form.image_url}
                    alt="Preview do produto"
                    style={{
                      maxWidth: '100%',
                      maxHeight: 200,
                      objectFit: 'contain',
                    }}
                    onError={() => setImgError(true)}
                  />
                  <button
                    type="button"
                    onClick={() => { set('image_url', ''); setImgError(false); }}
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      border: 'none',
                      background: 'rgba(0,0,0,0.5)',
                      color: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.8)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
                    title="Remover imagem"
                  >
                    <Icon name="close" size={16} />
                  </button>
                </div>
              ) : null}

              {/* Upload zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={async (e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) await handleImageUpload(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: dragOver ? '2px dashed #16a34a' : '2px dashed #e2e8f0',
                  borderRadius: 12,
                  padding: uploading ? '16px' : '24px 16px',
                  textAlign: 'center',
                  cursor: uploading ? 'wait' : 'pointer',
                  background: dragOver ? '#f0fdf4' : '#fafbfc',
                  transition: 'all 0.2s',
                  marginBottom: 10,
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) await handleImageUpload(file);
                    e.target.value = '';
                  }}
                />
                {uploading ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <span className="material-symbols-rounded" style={{ fontSize: 22, color: '#16a34a', animation: 'spin 1s linear infinite' }}>
                      progress_activity
                    </span>
                    <span style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: 600 }}>Enviando imagem...</span>
                  </div>
                ) : (
                  <>
                    <Icon name="cloud_upload" size={32} style={{ color: dragOver ? '#16a34a' : '#cbd5e1', marginBottom: 6 }} />
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
                      {form.image_url ? 'Clique para substituir a imagem' : 'Clique ou arraste uma imagem'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>
                      JPG, PNG, WebP ou GIF · Máximo 5 MB
                    </div>
                  </>
                )}
              </div>

              {/* Upload error */}
              {uploadError && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 12px',
                  background: '#fef2f2',
                  borderRadius: 8,
                  fontSize: '0.8rem',
                  color: '#dc2626',
                  marginBottom: 8,
                }}>
                  <Icon name="error_outline" size={16} />
                  {uploadError}
                </div>
              )}

              {/* URL fallback */}
              <details style={{ marginTop: 4 }}>
                <summary style={{
                  fontSize: '0.78rem',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}>
                  Ou cole uma URL de imagem
                </summary>
                <div style={{ marginTop: 8 }}>
                  <input
                    className="admin-form-input"
                    value={form.image_url}
                    onChange={(e) => { set('image_url', e.target.value); setImgError(false); }}
                    placeholder="https://exemplo.com/imagem.jpg"
                    style={{ fontSize: '0.82rem' }}
                  />
                </div>
              </details>
            </div>
          </div>

          {/* Row 5: description */}
          <div className="admin-form-section">
            <div className="admin-form-group admin-form-group--full">
              <label className="admin-form-label">Descrição</label>
              <textarea
                className="admin-form-input admin-form-textarea"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Descreva o produto brevemente…"
                rows={3}
              />
              <span className="admin-form-hint">
                {(form.description ?? '').length} / 300 caracteres
              </span>
            </div>
          </div>

          {/* Row 6: toggles */}
          <div className="admin-form-section admin-form-toggles">
            <label className="admin-toggle-label">
              <span className="admin-toggle-switch">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => set('active', e.target.checked)}
                />
                <span className="admin-toggle-thumb" />
              </span>
              <span>
                <strong>Produto ativo</strong>
                <span className="admin-toggle-sub">
                  {form.active ? 'Visível na loja' : 'Oculto da loja'}
                </span>
              </span>
            </label>

            <label className="admin-toggle-label">
              <span className="admin-toggle-switch">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => set('featured', e.target.checked)}
                />
                <span className="admin-toggle-thumb" />
              </span>
              <span>
                <strong>Em destaque ⭐</strong>
                <span className="admin-toggle-sub">
                  Aparece na seção de destaques
                </span>
              </span>
            </label>
          </div>
        </form>

        <div className="admin-modal-footer">
          <button type="button" className="admin-btn admin-btn--ghost" onClick={onCancel}>
            Cancelar
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            disabled={saving}
            onClick={handleSubmit}
          >
            {saving
              ? <><span className="admin-btn-spinner">⟳</span> Salvando…</>
              : form.id
              ? 'Salvar alterações'
              : 'Criar produto'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function AdminProducts() {
  const [products,       setProducts]       = useState([]);
  const [categories,     setCategories]     = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [editing,        setEditing]        = useState(null);
  const [search,         setSearch]         = useState('');
  const [filterActive,   setFilterActive]   = useState('all');
  const [filterFeatured, setFilterFeatured] = useState(false); // NEW: filtro por destaque
  const [filterCategory, setFilterCategory] = useState('');
  const [toast,          setToast]          = useState(null);
  const [confirmToggle,  setConfirmToggle]  = useState(null);

  const hasActiveFilters = filterActive !== 'all' || filterFeatured || filterCategory || search.trim();

  function clearFilters() {
    setSearch('');
    setFilterActive('all');
    setFilterFeatured(false);
    setFilterCategory('');
  }

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([fetchAllProducts(), fetchAllCategories()]);
      setProducts(p);
      setCategories(c);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function commitToggle(product) {
    setConfirmToggle(null);
    try {
      const updated = await toggleProductActive(product.id, !product.active);
      setProducts((prev) =>
        prev.map((p) => (p.id === updated.id ? { ...p, active: updated.active } : p))
      );
      setToast({
        type: 'success',
        msg: updated.active ? `"${updated.name}" reativado.` : `"${updated.name}" desativado.`,
      });
    } catch {
      setToast({ type: 'error', msg: 'Erro ao atualizar produto.' });
    }
  }

  function handleSave(saved) {
    setProducts((prev) => {
      const exists = prev.find((p) => p.id === saved.id);
      if (exists) return prev.map((p) => (p.id === saved.id ? { ...p, ...saved } : p));
      return [saved, ...prev];
    });
    setEditing(null);
    setToast({
      type: 'success',
      msg: saved.id ? `"${saved.name}" atualizado!` : `"${saved.name}" criado com sucesso!`,
    });
  }

  const filtered = products.filter((p) => {
    if (filterActive === 'active'   && !p.active)   return false;
    if (filterActive === 'inactive' &&  p.active)   return false;
    if (filterFeatured && !p.featured)              return false;
    if (filterCategory && p.category_id !== filterCategory) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.categories?.name?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    );
  });

  const activeCount   = products.filter((p) => p.active).length;
  const inactiveCount = products.length - activeCount;
  const featuredCount = products.filter((p) => p.featured).length;

  return (
    <div className="admin-page">
      {toast && (
        <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />
      )}

      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Produtos</h1>
          <p className="admin-page-subtitle">
            {loading
              ? 'Carregando…'
              : `${products.length} produto(s) · ${activeCount} ativo(s) · ${inactiveCount} inativo(s)`}
          </p>
        </div>
        <button
          className="admin-btn admin-btn--primary"
          onClick={() => setEditing('new')}
        >
          <Icon name="add" size={18} /> Novo Produto
        </button>
      </div>

      {/* Filters */}
      <div className="admin-filters">
        <div className="admin-search-wrapper" style={{ flex: 1, minWidth: 200 }}>
          <span className="admin-search-icon">
            <Icon name="search" size={18} style={{ color: '#94a3b8' }} />
          </span>
          <input
            type="text"
            className="admin-search admin-search--with-icon"
            placeholder="Buscar produto ou categoria…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="admin-search-clear" onClick={() => setSearch('')}>
              <Icon name="close" size={16} />
            </button>
          )}
        </div>

        <select
          className="admin-select"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <div className="admin-filter-tabs">
          {[
            { key: 'all',      label: 'Todos',    count: products.length },
            { key: 'active',   label: 'Ativos',   count: activeCount },
            { key: 'inactive', label: 'Inativos', count: inactiveCount },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              className={`admin-filter-tab ${
                filterActive === key && !filterFeatured ? 'active' : ''
              }`}
              onClick={() => { setFilterActive(key); setFilterFeatured(false); }}
            >
              {label}
              <span className="admin-tab-count">{count}</span>
            </button>
          ))}
          {/* Tab de destaque */}
          <button
            className={`admin-filter-tab ${filterFeatured ? 'active' : ''}`}
            onClick={() => { setFilterFeatured((v) => !v); setFilterActive('all'); }}
            title="Filtrar apenas produtos em destaque"
          >
            Destaques
            <span className="admin-tab-count">{featuredCount}</span>
          </button>
        </div>

        {/* Limpar todos os filtros */}
        {hasActiveFilters && (
          <button
            className="admin-btn admin-btn--ghost"
            onClick={clearFilters}
            style={{ whiteSpace: 'nowrap' }}
          >
            <Icon name="filter_list_off" size={16} /> Limpar filtros
          </button>
        )}
      </div>

      {/* Results count */}
      {!loading && (search || filterCategory || filterActive !== 'all') && (
        <p className="admin-results-count">
          {filtered.length} produto(s) encontrado(s)
          {search && <> para "<strong>{search}</strong>"</>}
          {' '}
          <button className="admin-clear-filters" onClick={() => { setSearch(''); setFilterCategory(''); setFilterActive('all'); }}>
            Limpar filtros
          </button>
        </p>
      )}

      {/* Table */}
      {loading ? (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {[200, 100, 80, 60, 60, 80].map((w, j) => (
                    <td key={j}><div className="admin-skeleton" style={{ width: w, height: 14 }} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : filtered.length === 0 ? (
        <div className="admin-no-results">
          <Icon name={search ? 'search_off' : 'inventory_2'} size={40} className="admin-no-results-icon" />
          <p className="admin-no-results-title">
            {search ? `Nenhum produto com "${search}"` : 'Nenhum produto neste filtro'}
          </p>
          <p className="admin-no-results-text">
            {search
              ? 'Tente um termo diferente ou crie um novo produto.'
              : 'Altere os filtros ou adicione novos produtos ao catálogo.'}
          </p>
          {hasActiveFilters && (
            <button className="admin-btn admin-btn--ghost" onClick={clearFilters} style={{ marginTop: 12 }}>
              <Icon name="filter_list_off" size={16} /> Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Categoria</th>
                <th>Preço</th>
                <th>Estoque</th>
                <th>Status</th>
                <th style={{ width: 90 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => (
                <tr
                  key={product.id}
                  className={!product.active ? 'admin-row--inactive' : ''}
                >
                  <td>
                    <div className="admin-product-cell">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="admin-product-img"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="admin-product-img-placeholder">
                          <Icon name="eco" size={24} style={{ color: '#86efac' }} />
                        </div>
                      )}
                      <div>
                        <div className="admin-table-name">
                          {product.name}
                          {product.featured && <span className="admin-featured-dot" title="Destaque">⭐</span>}
                        </div>
                        <div className="admin-table-sub">{product.unit}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {product.categories?.name
                      ? <span className="admin-category-pill">{product.categories.name}</span>
                      : <span style={{ color: '#cbd5e1' }}>—</span>}
                  </td>
                  <td>
                    <div className="admin-price-cell">
                      <span className={product.promotional_price ? 'admin-price--striked' : ''}>
                        {formatCurrency(product.price)}
                      </span>
                      {product.promotional_price && (
                        <span className="admin-price--promo">
                          {formatCurrency(product.promotional_price)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    {product.stock != null
                      ? <span className={product.stock === 0 ? 'admin-stock--zero' : ''}>{product.stock}</span>
                      : <span style={{ color: '#cbd5e1' }}>∞</span>}
                  </td>
                  <td>
                    <span
                      className="admin-badge"
                      style={
                        product.active
                          ? { background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }
                          : { background: '#f8fafc', color: '#94a3b8', border: '1px solid #e2e8f0' }
                      }
                    >
                      {product.active ? '● Ativo' : '○ Inativo'}
                    </span>
                  </td>
                  <td>
                    <div className="admin-action-group">
                      <button
                        className="admin-btn-icon"
                        onClick={() => setEditing(product)}
                        title="Editar produto"
                      >
                        <Icon name="edit" size={18} />
                      </button>
                      <button
                        className={`admin-btn-icon ${product.active ? 'admin-btn-icon--warn' : 'admin-btn-icon--ok'}`}
                        onClick={() =>
                          product.active
                            ? setConfirmToggle(product)
                            : commitToggle(product)
                        }
                        title={product.active ? 'Desativar' : 'Reativar'}
                      >
                        <Icon name={product.active ? 'block' : 'check_circle'} size={18} fill />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ProductForm
          product={editing === 'new' ? null : editing}
          categories={categories}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}

      {confirmToggle && (
        <ConfirmDialog
          message={`Desativar "${confirmToggle.name}"? Ele ficará oculto da loja para os clientes.`}
          onConfirm={() => commitToggle(confirmToggle)}
          onCancel={() => setConfirmToggle(null)}
        />
      )}
    </div>
  );
}
