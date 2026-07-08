import { useEffect, useRef, useState } from 'react';
import Icon from '../../components/ui/Icon';
import {
  fetchAllCoupons,
  createCoupon,
  updateCoupon,
  toggleCouponActive,
} from '../services/adminCoupons';

const EMPTY = {
  code: '',
  description: '',
  discount_type: 'percentage',
  discount_value: '',
  min_order: '',
  max_uses: '',
  expires_at: '',
  active: true,
};

function formatCurrency(v) {
  return Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('pt-BR');
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

function CouponForm({ coupon, onSave, onCancel }) {
  const [form, setForm]       = useState(coupon ?? EMPTY);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState(null);
  const codeRef = useRef(null);

  useEffect(() => { setTimeout(() => codeRef.current?.focus(), 60); }, []);
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onCancel(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  function set(field, value) { setForm(f => ({ ...f, [field]: value })); }

  function validate() {
    if (!form.code.trim())  return 'Código do cupom é obrigatório.';
    if (!form.discount_value || Number(form.discount_value) <= 0) return 'Informe o valor do desconto.';
    if (form.discount_type === 'percentage' && Number(form.discount_value) > 100) return 'Desconto percentual máximo é 100%.';
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        code:           form.code.trim().toUpperCase(),
        description:    form.description?.trim() || null,
        discount_type:  form.discount_type,
        discount_value: Number(form.discount_value),
        min_order:      form.min_order  ? Number(form.min_order)  : 0,
        max_uses:       form.max_uses   ? Number(form.max_uses)   : null,
        expires_at:     form.expires_at ? new Date(form.expires_at + 'T23:59:59').toISOString() : null,
        active:         form.active,
      };
      const saved = form.id
        ? await updateCoupon(form.id, payload)
        : await createCoupon(payload);
      onSave(saved);
    } catch (err) {
      setError(err.message ?? 'Erro ao salvar cupom.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-modal-overlay" onClick={onCancel}>
      <div className="admin-modal" onClick={e => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div>
            <h2 className="admin-modal-title">
              {form.id ? `Editar: ${form.code}` : 'Novo Cupom'}
            </h2>
          </div>
          <button className="admin-modal-close" onClick={onCancel}>
            <Icon name="close" size={20} />
          </button>
        </div>

        <form className="admin-modal-body" onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="admin-feedback admin-feedback--error admin-feedback--banner">
              <Icon name="warning" size={16} /> {error}
            </div>
          )}

          <div className="admin-form-section admin-form-row">
            <div className="admin-form-group">
              <label className="admin-form-label">Código <span className="admin-form-required">*</span></label>
              <input
                ref={codeRef}
                className="admin-form-input"
                value={form.code}
                onChange={e => set('code', e.target.value.toUpperCase())}
                placeholder="Ex: LUCCA10"
                style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}
              />
            </div>
            <div className="admin-form-group">
              <label className="admin-form-label">Tipo de desconto</label>
              <select className="admin-form-input" value={form.discount_type} onChange={e => set('discount_type', e.target.value)}>
                <option value="percentage">Percentual (%)</option>
                <option value="fixed">Valor fixo (R$)</option>
              </select>
            </div>
          </div>

          <div className="admin-form-section admin-form-row">
            <div className="admin-form-group">
              <label className="admin-form-label">
                Valor do desconto <span className="admin-form-required">*</span>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400, marginLeft: 4 }}>
                  {form.discount_type === 'percentage' ? '(%)' : '(R$)'}
                </span>
              </label>
              <input
                className="admin-form-input"
                type="number" step="0.01" min="0.01"
                value={form.discount_value}
                onChange={e => set('discount_value', e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="admin-form-group">
              <label className="admin-form-label">Pedido mínimo (R$)</label>
              <input
                className="admin-form-input"
                type="number" step="0.01" min="0"
                value={form.min_order}
                onChange={e => set('min_order', e.target.value)}
                placeholder="0 = sem mínimo"
              />
            </div>
          </div>

          <div className="admin-form-section admin-form-row">
            <div className="admin-form-group">
              <label className="admin-form-label">Máx. de usos</label>
              <input
                className="admin-form-input"
                type="number" min="1"
                value={form.max_uses}
                onChange={e => set('max_uses', e.target.value)}
                placeholder="Sem limite"
              />
            </div>
            <div className="admin-form-group">
              <label className="admin-form-label">Validade</label>
              <input
                className="admin-form-input"
                type="date"
                value={form.expires_at}
                onChange={e => set('expires_at', e.target.value)}
              />
            </div>
          </div>

          <div className="admin-form-section">
            <div className="admin-form-group admin-form-group--full">
              <label className="admin-form-label">Descrição interna (opcional)</label>
              <input
                className="admin-form-input"
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Ex: Cupom de boas-vindas para novos clientes"
              />
            </div>
          </div>

          <div className="admin-form-section admin-form-toggles">
            <label className="admin-toggle-label">
              <span className="admin-toggle-switch">
                <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} />
                <span className="admin-toggle-thumb" />
              </span>
              <span>
                <strong>Cupom ativo</strong>
                <span className="admin-toggle-sub">{form.active ? 'Aceitando novos usos' : 'Desativado'}</span>
              </span>
            </label>
          </div>
        </form>

        <div className="admin-modal-footer">
          <button type="button" className="admin-btn admin-btn--ghost" onClick={onCancel}>Cancelar</button>
          <button type="button" className="admin-btn admin-btn--primary" disabled={saving} onClick={handleSubmit}>
            {saving ? <><span className="admin-btn-spinner">⟳</span> Salvando…</> : form.id ? 'Salvar' : 'Criar cupom'}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ active, expired, maxReached }) {
  if (!active)     return <span className="admin-badge" style={{ background: '#f8fafc', color: '#94a3b8', border: '1px solid #e2e8f0' }}>○ Inativo</span>;
  if (expired)     return <span className="admin-badge" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5' }}>✕ Expirado</span>;
  if (maxReached)  return <span className="admin-badge" style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }}>⊗ Esgotado</span>;
  return             <span className="admin-badge" style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>● Ativo</span>;
}

export default function AdminCoupons() {
  const [coupons, setCoupons]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState(null);
  const [toast,   setToast]     = useState(null);
  const [search,  setSearch]    = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { setCoupons(await fetchAllCoupons()); }
    catch { setToast({ type: 'error', msg: 'Erro ao carregar cupons.' }); }
    finally { setLoading(false); }
  }

  function handleSave(saved) {
    setCoupons(prev => {
      const exists = prev.find(c => c.id === saved.id);
      if (exists) return prev.map(c => c.id === saved.id ? saved : c);
      return [saved, ...prev];
    });
    setEditing(null);
    setToast({ type: 'success', msg: `Cupom "${saved.code}" salvo!` });
  }

  async function handleToggle(coupon) {
    try {
      const updated = await toggleCouponActive(coupon.id, !coupon.active);
      setCoupons(prev => prev.map(c => c.id === updated.id ? updated : c));
      setToast({ type: 'success', msg: `"${updated.code}" ${updated.active ? 'ativado' : 'desativado'}.` });
    } catch {
      setToast({ type: 'error', msg: 'Erro ao atualizar cupom.' });
    }
  }

  const now = new Date();
  const filtered = coupons.filter(c =>
    !search || c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.description?.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = coupons.filter(c => c.active).length;

  return (
    <div className="admin-page">
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Cupons de Desconto</h1>
          <p className="admin-page-subtitle">
            {loading ? 'Carregando…' : `${coupons.length} cupom(ns) · ${activeCount} ativo(s)`}
          </p>
        </div>
        <button className="admin-btn admin-btn--primary" onClick={() => setEditing('new')}>
          <Icon name="add" size={18} /> Novo Cupom
        </button>
      </div>

      <div className="admin-filters">
        <div className="admin-search-wrapper" style={{ flex: 1, minWidth: 200 }}>
          <span className="admin-search-icon">
            <Icon name="search" size={18} style={{ color: '#94a3b8' }} />
          </span>
          <input
            type="text"
            className="admin-search admin-search--with-icon"
            placeholder="Buscar código ou descrição…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="admin-search-clear" onClick={() => setSearch('')}>
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
                  {[100, 80, 80, 80, 80, 60].map((w, j) => (
                    <td key={j}><div className="admin-skeleton" style={{ width: w, height: 14 }} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : filtered.length === 0 ? (
        <div className="admin-no-results">
          <Icon name="confirmation_number" size={40} className="admin-no-results-icon" />
          <p className="admin-no-results-title">
            {search ? `Nenhum cupom com "${search}"` : 'Nenhum cupom criado ainda'}
          </p>
          <p className="admin-no-results-text">
            {search ? 'Tente outro termo.' : 'Crie o primeiro cupom de desconto para sua loja.'}
          </p>
          {!search && (
            <button className="admin-btn admin-btn--primary" onClick={() => setEditing('new')} style={{ marginTop: 12 }}>
              <Icon name="add" size={16} /> Criar primeiro cupom
            </button>
          )}
        </div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Desconto</th>
                <th>Mínimo</th>
                <th>Usos</th>
                <th>Validade</th>
                <th>Status</th>
                <th style={{ width: 90 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(coupon => {
                const expired   = coupon.expires_at && new Date(coupon.expires_at) < now;
                const maxReached = coupon.max_uses != null && coupon.uses_count >= coupon.max_uses;
                return (
                  <tr key={coupon.id} className={!coupon.active ? 'admin-row--inactive' : ''}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.95rem', letterSpacing: '0.05em' }}>
                          {coupon.code}
                        </span>
                        {coupon.description && (
                          <span className="admin-table-sub">{coupon.description}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#16a34a' }}>
                        {coupon.discount_type === 'percentage'
                          ? `${coupon.discount_value}%`
                          : formatCurrency(coupon.discount_value)}
                      </span>
                    </td>
                    <td>
                      {coupon.min_order > 0
                        ? <span style={{ fontSize: '0.85rem' }}>{formatCurrency(coupon.min_order)}</span>
                        : <span style={{ color: '#cbd5e1' }}>—</span>}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem' }}>
                        {coupon.uses_count}
                        {coupon.max_uses != null && <span style={{ color: '#94a3b8' }}> / {coupon.max_uses}</span>}
                      </span>
                    </td>
                    <td>
                      {coupon.expires_at
                        ? <span style={{ fontSize: '0.85rem', color: expired ? '#dc2626' : '#475569' }}>
                            {formatDate(coupon.expires_at)}
                          </span>
                        : <span style={{ color: '#cbd5e1' }}>—</span>}
                    </td>
                    <td>
                      <StatusPill active={coupon.active} expired={expired} maxReached={maxReached} />
                    </td>
                    <td>
                      <div className="admin-action-group">
                        <button
                          className="admin-btn-icon"
                          onClick={() => setEditing(coupon)}
                          title="Editar"
                        >
                          <Icon name="edit" size={18} />
                        </button>
                        <button
                          className={`admin-btn-icon ${coupon.active ? 'admin-btn-icon--warn' : 'admin-btn-icon--ok'}`}
                          onClick={() => handleToggle(coupon)}
                          title={coupon.active ? 'Desativar' : 'Ativar'}
                        >
                          <Icon name={coupon.active ? 'block' : 'check_circle'} size={18} fill />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <CouponForm
          coupon={editing === 'new' ? null : editing}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}
