import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '../../components/ui/Icon';
import { fetchAllProducts } from '../services/adminProducts';
import {
  createPromotion,
  fetchAllPromotions,
  togglePromotionActive,
  updatePromotion,
} from '../services/adminPromotions';

const EMPTY = {
  name: '',
  description: '',
  type: 'product_price',
  min_subtotal: '',
  trigger_product_id: '',
  reward_product_id: '',
  reward_price: '',
  max_quantity_per_order: 1,
  starts_at: '',
  ends_at: '',
  active: true,
};

function formatCurrency(value) {
  return Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(iso) {
  if (!iso) return 'Sem data';
  return new Date(iso).toLocaleDateString('pt-BR');
}

function toDateInput(iso) {
  if (!iso) return '';
  return new Date(iso).toISOString().slice(0, 10);
}

function dateToIso(date, endOfDay = false) {
  if (!date) return null;
  return new Date(`${date}T${endOfDay ? '23:59:59' : '00:00:00'}`).toISOString();
}

function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className={`admin-toast admin-toast--${type}`}>
      <Icon name={type === 'success' ? 'check_circle' : 'error_outline'} size={16} />
      {msg}
    </div>
  );
}

function StatusPill({ promotion }) {
  const now = new Date();
  const scheduled = promotion.starts_at && new Date(promotion.starts_at) > now;
  const expired = promotion.ends_at && new Date(promotion.ends_at) < now;

  if (!promotion.active) return <span className="admin-badge promo-badge-muted">Inativa</span>;
  if (expired) return <span className="admin-badge promo-badge-danger">Expirada</span>;
  if (scheduled) return <span className="admin-badge promo-badge-info">Agendada</span>;
  return <span className="admin-badge promo-badge-success">Ativa</span>;
}

function productOptionLabel(product) {
  const price = product.promotional_price && Number(product.promotional_price) < Number(product.price)
    ? product.promotional_price
    : product.price;
  return `${product.name} - ${formatCurrency(price)}`;
}

const PROMOTION_TYPES = {
  product_price: {
    icon: 'local_offer',
    title: 'Preço especial',
    description: 'Ex: acima de R$ 20, leite sai por R$ 3,99.',
  },
  free_product: {
    icon: 'redeem',
    title: 'Produto grátis',
    description: 'Ex: comprou frango, ganha tempero no carrinho.',
  },
};

function PromotionForm({ promotion, products, onSave, onCancel }) {
  const [form, setForm] = useState(() => promotion ? {
    ...EMPTY,
    ...promotion,
    min_subtotal: promotion.min_subtotal ?? '',
    reward_price: promotion.reward_price ?? '',
    max_quantity_per_order: promotion.max_quantity_per_order ?? 1,
    starts_at: toDateInput(promotion.starts_at),
    ends_at: toDateInput(promotion.ends_at),
  } : EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const firstRef = useRef(null);
  const hasProducts = products.length > 0;
  const selectedType = PROMOTION_TYPES[form.type];

  useEffect(() => { setTimeout(() => firstRef.current?.focus(), 60); }, []);
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onCancel(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  function set(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function setType(type) {
    setForm((current) => ({
      ...current,
      type,
      trigger_product_id: type === 'free_product' ? current.trigger_product_id : '',
      reward_price: type === 'product_price' ? current.reward_price : '',
    }));
  }

  function validate() {
    if (!form.name.trim()) return 'Nome da promoção é obrigatório.';
    if (!hasProducts) return 'Cadastre ou carregue produtos antes de criar uma promoção.';
    if (!form.reward_product_id) return 'Escolha o produto beneficiado.';
    if (Number(form.min_subtotal || 0) < 0) return 'Valor mínimo não pode ser negativo.';
    if (Number(form.max_quantity_per_order || 0) < 1) return 'Limite por pedido deve ser pelo menos 1.';
    if (form.type === 'product_price') {
      if (!form.reward_price || Number(form.reward_price) < 0) return 'Informe o preço promocional.';
    }
    if (form.type === 'free_product' && !form.trigger_product_id) {
      return 'Escolha o produto que libera o brinde.';
    }
    if (form.starts_at && form.ends_at && form.starts_at > form.ends_at) {
      return 'A data inicial precisa ser antes da data final.';
    }
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true);
    setError(null);

    const payload = {
      name: form.name.trim(),
      description: form.description?.trim() || null,
      type: form.type,
      min_subtotal: form.min_subtotal ? Number(form.min_subtotal) : 0,
      trigger_product_id: form.type === 'free_product' ? form.trigger_product_id : null,
      reward_product_id: form.reward_product_id,
      reward_price: form.type === 'product_price' ? Number(form.reward_price) : null,
      max_quantity_per_order: Number(form.max_quantity_per_order || 1),
      priority: Number(form.priority ?? 100),
      starts_at: dateToIso(form.starts_at),
      ends_at: dateToIso(form.ends_at, true),
      active: form.active,
    };

    try {
      const saved = form.id
        ? await updatePromotion(form.id, payload)
        : await createPromotion(payload);
      onSave(saved);
    } catch (err) {
      setError(err.message ?? 'Erro ao salvar promoção.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-modal-overlay" onClick={onCancel}>
      <div className="admin-modal admin-modal--lg" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div>
            <h2 className="admin-modal-title">
              {form.id ? `Editar: ${form.name}` : 'Nova Promoção'}
            </h2>
            <p className="admin-modal-sub">
              {selectedType.description}
            </p>
          </div>
          <button className="admin-modal-close" onClick={onCancel} aria-label="Fechar">
            <Icon name="close" size={20} />
          </button>
        </div>

        <form className="admin-modal-body" onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="admin-feedback admin-feedback--error admin-feedback--banner">
              <Icon name="warning" size={16} /> {error}
            </div>
          )}

          {!hasProducts && (
            <div className="admin-feedback admin-feedback--warning admin-feedback--banner">
              <Icon name="inventory_2" size={16} />
              Nenhum produto carregado. As promoções precisam de pelo menos um produto cadastrado para aparecer no carrinho.
            </div>
          )}

          <div className="promo-form-step">
            <div className="promo-form-step-head">
              <span className="promo-form-step-number">1</span>
              <div>
                <h3>Escolha o tipo da promoção</h3>
                <p>Comece pelo comportamento que o carrinho deve aplicar automaticamente.</p>
              </div>
            </div>
            <div className="promo-type-grid" role="radiogroup" aria-label="Tipo da promoção">
              {Object.entries(PROMOTION_TYPES).map(([type, config]) => (
                <button
                  key={type}
                  type="button"
                  className={`promo-type-card ${form.type === type ? 'promo-type-card--active' : ''}`}
                  onClick={() => setType(type)}
                  role="radio"
                  aria-checked={form.type === type}
                >
                  <span className="promo-type-icon"><Icon name={config.icon} size={20} /></span>
                  <span>
                    <strong>{config.title}</strong>
                    <small>{config.description}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="promo-form-step">
            <div className="promo-form-step-head">
              <span className="promo-form-step-number">2</span>
              <div>
                <h3>Defina nome e regra de entrada</h3>
                <p>Use um nome simples para o time identificar a ação depois.</p>
              </div>
            </div>
            <div className="admin-form-row promo-form-row--wide">
              <div className="admin-form-group">
                <label className="admin-form-label">Nome <span className="admin-form-required">*</span></label>
                <input
                  ref={firstRef}
                  className="admin-form-input"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Ex: Leite da semana"
                />
                <span className="admin-form-hint">Esse nome aparece só no painel administrativo.</span>
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Compra mínima (R$)</label>
                <input
                  className="admin-form-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.min_subtotal}
                  onChange={(e) => set('min_subtotal', e.target.value)}
                  placeholder="0 = sem mínimo"
                />
                <span className="admin-form-hint">Deixe vazio ou 0 para valer em qualquer carrinho.</span>
              </div>
            </div>
          </div>

          <div className="promo-form-step">
            <div className="promo-form-step-head">
              <span className="promo-form-step-number">3</span>
              <div>
                <h3>Configure produtos e benefício</h3>
                <p>
                  {form.type === 'free_product'
                    ? 'Escolha o produto que destrava o brinde e qual item será adicionado grátis.'
                    : 'Escolha qual produto terá preço especial quando a regra for atingida.'}
                </p>
              </div>
            </div>

            {form.type === 'free_product' && (
              <div className="admin-form-section">
                <div className="admin-form-group admin-form-group--full">
                  <label className="admin-form-label">Produto que libera o brinde <span className="admin-form-required">*</span></label>
                  <select
                    className="admin-form-input"
                    value={form.trigger_product_id ?? ''}
                    onChange={(e) => set('trigger_product_id', e.target.value)}
                    disabled={!hasProducts}
                  >
                    <option value="">{hasProducts ? 'Selecione o produto comprado pelo cliente' : 'Nenhum produto disponível'}</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>{productOptionLabel(product)}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="admin-form-row promo-form-row--wide">
              <div className="admin-form-group">
                <label className="admin-form-label">
                  Produto beneficiado <span className="admin-form-required">*</span>
                </label>
                <select
                  className="admin-form-input"
                  value={form.reward_product_id ?? ''}
                  onChange={(e) => set('reward_product_id', e.target.value)}
                  disabled={!hasProducts}
                >
                  <option value="">{hasProducts ? 'Selecione o produto que recebe o benefício' : 'Nenhum produto disponível'}</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>{productOptionLabel(product)}</option>
                  ))}
                </select>
              </div>
              {form.type === 'product_price' && (
                <div className="admin-form-group">
                  <label className="admin-form-label">Preço especial (R$) <span className="admin-form-required">*</span></label>
                  <input
                    className="admin-form-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.reward_price}
                    onChange={(e) => set('reward_price', e.target.value)}
                    placeholder="Ex: 3,99"
                  />
                  <span className="admin-form-hint">Preço final que o cliente vai pagar pelo item.</span>
                </div>
              )}
            </div>
          </div>

          <div className="promo-form-step">
            <div className="promo-form-step-head">
              <span className="promo-form-step-number">4</span>
              <div>
                <h3>Limites, validade e observação</h3>
                <p>Evite surpresas definindo quantidade máxima e período da ação.</p>
              </div>
            </div>

            <div className="admin-form-row promo-form-row--compact">
              <div className="admin-form-group">
                <label className="admin-form-label">Limite por pedido</label>
                <input
                  className="admin-form-input"
                  type="number"
                  min="1"
                  value={form.max_quantity_per_order}
                  onChange={(e) => set('max_quantity_per_order', e.target.value)}
                />
                <span className="admin-form-hint">Ex: 1 leite com preço especial por carrinho.</span>
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Início</label>
                <input className="admin-form-input" type="date" value={form.starts_at} onChange={(e) => set('starts_at', e.target.value)} />
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Fim</label>
                <input className="admin-form-input" type="date" value={form.ends_at} onChange={(e) => set('ends_at', e.target.value)} />
              </div>
            </div>

            <div className="admin-form-section">
              <div className="admin-form-group admin-form-group--full">
                <label className="admin-form-label">Descrição interna</label>
                <input
                  className="admin-form-input"
                  value={form.description ?? ''}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="Ex: Campanha combinada no WhatsApp de sexta"
                />
              </div>
            </div>
          </div>

          <div className="admin-form-section admin-form-toggles promo-active-card">
            <label className="admin-toggle-label">
              <span className="admin-toggle-switch">
                <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} />
                <span className="admin-toggle-thumb" />
              </span>
              <span>
                <strong>{form.active ? 'Promoção ativa' : 'Promoção pausada'}</strong>
                <span className="admin-toggle-sub">{form.active ? 'Já pode aplicar automaticamente no carrinho.' : 'Fica salva, mas não aparece para o cliente.'}</span>
              </span>
            </label>
          </div>

        </form>

        <div className="admin-modal-footer">
          <button type="button" className="admin-btn admin-btn--ghost" onClick={onCancel}>Cancelar</button>
          <button type="button" className="admin-btn admin-btn--primary" disabled={saving || !hasProducts} onClick={handleSubmit}>
            {saving ? <><span className="admin-btn-spinner">⟳</span> Salvando...</> : form.id ? 'Salvar' : 'Criar promoção'}
          </button>
        </div>
      </div>
    </div>
  );
}

function benefitLabel(promotion) {
  if (promotion.type === 'free_product') {
    return `${promotion.max_quantity_per_order}x ${promotion.reward_product?.name ?? 'produto'} grátis`;
  }
  return `${promotion.reward_product?.name ?? 'Produto'} por ${formatCurrency(promotion.reward_price)}`;
}

function conditionLabel(promotion) {
  const min = Number(promotion.min_subtotal ?? 0);
  const parts = [];
  if (min > 0) parts.push(`Acima de ${formatCurrency(min)}`);
  if (promotion.type === 'free_product') {
    parts.push(`Levando ${promotion.trigger_product?.name ?? 'produto'}`);
  }
  return parts.length ? parts.join(' + ') : 'Sempre ativa';
}

export default function AdminPromotions() {
  const [promotions, setPromotions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [productsError, setProductsError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setProductsError(null);

    const [promoResult, productResult] = await Promise.allSettled([
      fetchAllPromotions(),
      fetchAllProducts(),
    ]);

    if (promoResult.status === 'fulfilled') {
      setPromotions(promoResult.value);
    } else {
      setPromotions([]);
      setLoadError('Não foi possível carregar promoções agora. Os produtos continuam disponíveis para preparar uma nova ação.');
      setToast({ type: 'error', msg: 'Erro ao carregar promoções.' });
    }

    if (productResult.status === 'fulfilled') {
      setProducts(productResult.value ?? []);
    } else {
      setProducts([]);
      setProductsError('Não consegui carregar os produtos. Recarregue a página ou confira o cadastro de produtos.');
      setToast({ type: 'error', msg: 'Erro ao carregar produtos.' });
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    // Initial remote data fetch for the admin screen.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  function openNew(type = 'product_price') {
    setEditing({ ...EMPTY, type });
  }

  function handleSave(saved) {
    setPromotions((prev) => {
      const exists = prev.find((promotion) => promotion.id === saved.id);
      if (exists) return prev.map((promotion) => promotion.id === saved.id ? saved : promotion);
      return [saved, ...prev];
    });
    setEditing(null);
    setToast({ type: 'success', msg: `Promoção "${saved.name}" salva.` });
  }

  async function handleToggle(promotion) {
    try {
      const updated = await togglePromotionActive(promotion.id, !promotion.active);
      setPromotions((prev) => prev.map((row) => row.id === updated.id ? updated : row));
      setToast({ type: 'success', msg: `"${updated.name}" ${updated.active ? 'ativada' : 'pausada'}.` });
    } catch {
      setToast({ type: 'error', msg: 'Erro ao atualizar promoção.' });
    }
  }

  const filtered = promotions.filter((promotion) => {
    const term = search.toLowerCase();
    return !term
      || promotion.name.toLowerCase().includes(term)
      || promotion.description?.toLowerCase().includes(term)
      || promotion.reward_product?.name?.toLowerCase().includes(term)
      || promotion.trigger_product?.name?.toLowerCase().includes(term);
  });
  const activeCount = promotions.filter((promotion) => promotion.active).length;

  return (
    <div className="admin-page">
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Promoções</h1>
          <p className="admin-page-subtitle">
            {loading ? 'Carregando...' : `${promotions.length} promoção(ões) · ${activeCount} ativa(s)`}
          </p>
        </div>
        <button className="admin-btn admin-btn--primary" onClick={() => openNew()}>
          <Icon name="add" size={18} /> Nova Promoção
        </button>
      </div>

      {(loadError || productsError) && (
        <div className="admin-feedback admin-feedback--warning admin-feedback--banner promo-page-alert">
          <Icon name="info" size={16} />
          <span>{loadError || productsError}</span>
          <button type="button" className="promo-inline-action" onClick={load}>Tentar de novo</button>
        </div>
      )}

      <div className="admin-filters">
        <div className="admin-search-wrapper promo-search">
          <span className="admin-search-icon">
            <Icon name="search" size={18} />
          </span>
          <input
            type="text"
            className="admin-search admin-search--with-icon"
            placeholder="Buscar promoção ou produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="admin-search-clear" onClick={() => setSearch('')} aria-label="Limpar busca">
              <Icon name="close" size={16} />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <tbody>
              {[...Array(4)].map((_, i) => (
                <tr key={i}>
                  {[140, 160, 180, 120, 80].map((w, j) => (
                    <td key={j}><div className="admin-skeleton" style={{ width: w, height: 14 }} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : filtered.length === 0 ? (
        <div className="admin-no-results promo-empty-state">
          <span className="promo-empty-icon"><Icon name="sell" size={34} /></span>
          <p className="admin-no-results-title">
            {search ? `Nenhuma promoção com "${search}"` : 'Nenhuma promoção criada ainda'}
          </p>
          <p className="admin-no-results-text">
            {search
              ? 'Tente buscar pelo nome da ação ou pelo produto.'
              : `${products.length} produto(s) disponíveis para montar a primeira ação do carrinho.`}
          </p>
          {!search && (
            <div className="promo-empty-actions">
              <button type="button" className="admin-btn admin-btn--primary" onClick={() => openNew('product_price')}>
                <Icon name="local_offer" size={18} /> Criar preço especial
              </button>
              <button type="button" className="admin-btn admin-btn--secondary" onClick={() => openNew('free_product')}>
                <Icon name="redeem" size={18} /> Criar brinde
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Promoção</th>
                <th>Condição</th>
                <th>Benefício</th>
                <th>Período</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((promotion) => (
                <tr key={promotion.id} className={!promotion.active ? 'admin-row--inactive' : ''}>
                  <td>
                    <div className="promo-cell-title">
                      <span className="admin-table-name">{promotion.name}</span>
                      {promotion.description && <span className="admin-table-sub">{promotion.description}</span>}
                    </div>
                  </td>
                  <td>{conditionLabel(promotion)}</td>
                  <td>
                    <span className="promo-benefit">{benefitLabel(promotion)}</span>
                    <span className="admin-table-sub">Limite: {promotion.max_quantity_per_order} por pedido</span>
                  </td>
                  <td>{formatDate(promotion.starts_at)} até {formatDate(promotion.ends_at)}</td>
                  <td><StatusPill promotion={promotion} /></td>
                  <td>
                    <div className="admin-action-group">
                      <button className="admin-btn-icon" onClick={() => setEditing(promotion)} title="Editar">
                        <Icon name="edit" size={18} />
                      </button>
                      <button
                        className={`admin-btn-icon ${promotion.active ? 'admin-btn-icon--warn' : 'admin-btn-icon--ok'}`}
                        onClick={() => handleToggle(promotion)}
                        title={promotion.active ? 'Pausar' : 'Ativar'}
                      >
                        <Icon name={promotion.active ? 'pause_circle' : 'play_circle'} size={18} fill />
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
        <PromotionForm
          promotion={editing === 'new' ? null : editing}
          products={products}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}
