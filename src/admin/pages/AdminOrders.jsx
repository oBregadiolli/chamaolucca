import { useEffect, useRef, useState } from 'react';
import { fetchAllOrders, fetchOrderById, updateOrderStatus } from '../services/adminOrders';
import Icon from '../../components/ui/Icon';

// ─── Config ────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: 'received',   label: 'Recebido',   short: 'Recebido',  icon: 'mark_email_unread', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  { value: 'preparing',  label: 'Preparando', short: 'Prep.',     icon: 'soup_kitchen',       color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  { value: 'delivering', label: 'Entregando', short: 'Entrega',   icon: 'two_wheeler',        color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  { value: 'delivered',  label: 'Entregue',   short: 'Entregue',  icon: 'check_circle',       color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  { value: 'cancelled',  label: 'Cancelado',  short: 'Cancelado', icon: 'cancel',             color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
];

const PAYMENT_STATUS_CFG = {
  pending:    { label: 'Aguardando Pix', icon: 'hourglass_empty', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  approved:   { label: 'Pago',          icon: 'check_circle',    color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  in_process: { label: 'Processando',   icon: 'sync',            color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  rejected:   { label: 'Recusado',      icon: 'cancel',          color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  cancelled:  { label: 'Cancelado',     icon: 'block',           color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
  refunded:   { label: 'Estornado',     icon: 'undo',            color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' },
};

function PaymentBadge({ status }) {
  if (!status) return null;
  const cfg = PAYMENT_STATUS_CFG[status] ?? PAYMENT_STATUS_CFG.pending;
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '2px 8px', borderRadius: 999,
        fontSize: '0.72rem', fontWeight: 600,
        background: cfg.bg, color: cfg.color,
        border: `1px solid ${cfg.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      <Icon name={cfg.icon} size={14} fill style={{ color: cfg.color }} /> {cfg.label}
    </span>
  );
}

const cfgOf = (status) =>
  STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0];

// ─── Helpers ────────────────────────────────────────────────
function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDateOnly(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: '2-digit',
  });
}

function formatCurrency(value) {
  return Number(value ?? 0).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL',
  });
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `${m}min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

// ─── Sub-components ──────────────────────────────────────────
function StatusBadge({ status, size = 'md' }) {
  const cfg = cfgOf(status);
  return (
    <span
      className={`admin-status-badge admin-status-badge--${size}`}
      style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}
    >
      <span className="admin-status-icon">
        <Icon name={cfg.icon} size={14} fill style={{ color: cfg.color }} />
      </span>
      {cfg.label}
    </span>
  );
}

function Toast({ msg, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className={`admin-toast admin-toast--${type}`}>
      <Icon name={type === 'success' ? 'check' : 'close'} size={16} /> {msg}
    </div>
  );
}

function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="admin-confirm-overlay" onClick={onCancel}>
      <div className="admin-confirm-box" onClick={(e) => e.stopPropagation()}>
        <p className="admin-confirm-msg">{message}</p>
        <div className="admin-confirm-actions">
          <button className="admin-btn admin-btn--ghost" onClick={onCancel}>
            Cancelar
          </button>
          <button className="admin-btn admin-btn--danger" onClick={onConfirm}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="admin-skeleton-row">
      {[60, 160, 100, 70, 90, 120, 50].map((w, i) => (
        <td key={i}><div className="admin-skeleton" style={{ width: w }} /></td>
      ))}
    </tr>
  );
}

// ─── Order Detail Modal ───────────────────────────────────────
function OrderDetailModal({ orderId, onClose, onStatusUpdated }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [toast, setToast] = useState(null);
  const [pendingStatus, setPendingStatus] = useState(null);

  useEffect(() => {
    fetchOrderById(orderId)
      .then(setOrder)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [orderId]);

  // Close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function commitStatusChange(newStatus) {
    setPendingStatus(null);
    setUpdating(true);
    try {
      await updateOrderStatus(orderId, newStatus);
      setOrder((prev) => ({ ...prev, status: newStatus }));
      onStatusUpdated?.(orderId, newStatus);
      setToast({ type: 'success', msg: 'Status atualizado!' });
    } catch {
      setToast({ type: 'error', msg: 'Erro ao atualizar status.' });
    } finally {
      setUpdating(false);
    }
  }

  function handleSelectChange(e) {
    const newStatus = e.target.value;
    const currentIdx = STATUS_OPTIONS.findIndex((s) => s.value === order.status);
    const newIdx = STATUS_OPTIONS.findIndex((s) => s.value === newStatus);
    if (newStatus === 'cancelled' || newIdx < currentIdx) {
      setPendingStatus(newStatus);
    } else {
      commitStatusChange(newStatus);
    }
  }

  const cfg = order ? cfgOf(order.status) : null;

  return (
    <>
      <div className="admin-modal-overlay" onClick={onClose}>
        <div
          className="admin-modal admin-modal--order"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="admin-modal-header admin-modal-header--colored"
            style={cfg ? { borderBottom: `3px solid ${cfg.border}` } : {}}
          >
            <div className="admin-modal-header-left">
              {order ? (
                <>
                  <span className="admin-order-num">Pedido #{order.order_number}</span>
                  <StatusBadge status={order.status} size="sm" />
                  <span className="admin-modal-sub">{formatDateTime(order.created_at)}</span>
                </>
              ) : (
                <div className="admin-skeleton" style={{ width: 160, height: 20 }} />
              )}
            </div>
            <button className="admin-modal-close" onClick={onClose} aria-label="Fechar">
              <Icon name="close" size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="admin-modal-body">
            {loading ? (
              <div className="admin-modal-skeleton">
                {[180, 140, 200, 160, 220].map((w, i) => (
                  <div key={i} className="admin-skeleton" style={{ width: w, height: 14, marginBottom: 12 }} />
                ))}
              </div>
            ) : (
              <>
                {/* ── Alterar Status ── */}
                <div className="admin-detail-section">
                  <div className="admin-detail-section-header">
                    <h3 className="admin-detail-section-title">Alterar Status</h3>
                    {updating && <span className="admin-updating-pill">Atualizando…</span>}
                  </div>

                  <div className="admin-status-pipeline">
                    {STATUS_OPTIONS.filter(s => s.value !== 'cancelled').map((s) => {
                      const currentIdx = STATUS_OPTIONS.findIndex(x => x.value === order.status);
                      const thisIdx = STATUS_OPTIONS.findIndex(x => x.value === s.value);
                      const isDone = thisIdx < currentIdx && order.status !== 'cancelled';
                      const isCurrent = s.value === order.status;
                      return (
                        <button
                          key={s.value}
                          className={`admin-pipeline-step ${isCurrent ? 'current' : ''} ${isDone ? 'done' : ''}`}
                          style={isCurrent ? { borderColor: s.border, background: s.bg, color: s.color } : {}}
                          onClick={() => {
                            if (!isCurrent && !updating) {
                              const currentIdx2 = STATUS_OPTIONS.findIndex(x => x.value === order.status);
                              const newIdx = STATUS_OPTIONS.findIndex(x => x.value === s.value);
                              if (newIdx < currentIdx2) setPendingStatus(s.value);
                              else commitStatusChange(s.value);
                            }
                          }}
                          disabled={updating}
                        >
                          <Icon name={s.icon} size={16} fill style={{ color: isCurrent ? s.color : undefined }} />
                          <span>{s.short}</span>
                        </button>
                      );
                    })}
                  </div>

                  {order.status !== 'cancelled' && (
                    <button
                      className="admin-cancel-order-btn"
                      onClick={() => setPendingStatus('cancelled')}
                      disabled={updating}
                    >
                      <Icon name="cancel" size={16} fill /> Cancelar pedido
                    </button>
                  )}

                  {toast && (
                    <Toast
                      msg={toast.msg}
                      type={toast.type}
                      onDone={() => setToast(null)}
                    />
                  )}
                </div>

                {/* ── Pagamento ── */}
                <div className="admin-detail-section">
                  <h3 className="admin-detail-section-title">Pagamento</h3>
                  <div className="admin-detail-grid">
                    <div className="admin-detail-item">
                      <span className="admin-detail-label">Status</span>
                      <PaymentBadge status={order.payment_status} />
                    </div>
                    <div className="admin-detail-item">
                      <span className="admin-detail-label">Método</span>
                      <span className="admin-detail-value admin-capitalize">{order.payment_method ?? '—'}</span>
                    </div>
                    {order.payment_id && (
                      <div className="admin-detail-item">
                        <span className="admin-detail-label">ID MP</span>
                        <span className="admin-detail-value" style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>
                          {order.payment_id}
                        </span>
                      </div>
                    )}
                    {order.paid_at && (
                      <div className="admin-detail-item">
                        <span className="admin-detail-label">Pago em</span>
                        <span className="admin-detail-value">{formatDateTime(order.paid_at)}</span>
                      </div>
                    )}
                  </div>
                  {order.pix_qr_code && order.payment_status === 'pending' && (
                    <div style={{ marginTop: 10 }}>
                      <div className="admin-detail-label" style={{ marginBottom: 6 }}>Código Pix (cliente)</div>
                      <div style={{
                        background: '#f8fafc', border: '1px solid #e2e8f0',
                        borderRadius: 8, padding: '8px 12px',
                        fontFamily: 'monospace', fontSize: '0.68rem',
                        color: '#475569', wordBreak: 'break-all',
                        maxHeight: 60, overflow: 'hidden',
                      }}>
                        {order.pix_qr_code.slice(0, 80)}…
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Cliente ── */}
                <div className="admin-detail-section">
                  <h3 className="admin-detail-section-title">Cliente</h3>
                  <div className="admin-detail-grid">
                    <div className="admin-detail-item">
                      <span className="admin-detail-label">Nome</span>
                      <span className="admin-detail-value">{order.profiles?.name ?? '—'}</span>
                    </div>
                    <div className="admin-detail-item">
                      <span className="admin-detail-label">Telefone</span>
                      <span className="admin-detail-value">
                        {order.phone ?? order.profiles?.phone ?? '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── Entrega ── */}
                <div className="admin-detail-section">
                  <h3 className="admin-detail-section-title">Entrega</h3>
                  <div className="admin-detail-address-card">
                    <div className="admin-detail-address-icon">
                      <Icon name="location_on" size={20} fill style={{ color: '#ef4444' }} />
                    </div>
                    <div>
                      <div className="admin-detail-value">
                        {order.delivery_address}
                        {order.delivery_complement ? `, ${order.delivery_complement}` : ''}
                      </div>
                      {order.neighborhood && (
                        <div className="admin-detail-sub">{order.neighborhood}</div>
                      )}
                      {order.zip_code && (
                        <div className="admin-detail-sub">CEP {order.zip_code}</div>
                      )}
                    </div>
                  </div>
                  <div className="admin-detail-grid" style={{ marginTop: 12 }}>
                    <div className="admin-detail-item">
                      <span className="admin-detail-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Icon name="calendar_today" size={14} /> Data prevista
                      </span>
                      <span className="admin-detail-value">
                        {order.delivery_date ? formatDateOnly(order.delivery_date) : '—'}
                        {order.delivery_time ? ` · ${order.delivery_time}` : ''}
                      </span>
                    </div>
                    <div className="admin-detail-item">
                      <span className="admin-detail-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Icon name="credit_card" size={14} /> Pagamento
                      </span>
                      <span className="admin-detail-value admin-capitalize">
                        {order.payment_method ?? '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── Itens ── */}
                <div className="admin-detail-section">
                  <h3 className="admin-detail-section-title">
                    Itens ({order.order_items?.length ?? 0})
                  </h3>
                  <div className="admin-items-list">
                    {order.order_items?.map((item) => (
                      <div key={item.id} className="admin-item-row">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.product_name} className="admin-item-img" />
                        ) : (
                          <div className="admin-item-img-placeholder">
                            <Icon name="inventory_2" size={22} style={{ color: '#94a3b8' }} />
                          </div>
                        )}
                        <div className="admin-item-info">
                          <div className="admin-item-name">{item.product_name}</div>
                          <div className="admin-item-qty">
                            {item.quantity}× {formatCurrency(item.unit_price)}
                          </div>
                        </div>
                        <div className="admin-item-total">
                          {formatCurrency(item.total_price)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Resumo ── */}
                <div className="admin-detail-section admin-totals-box">
                  <div className="admin-totals-row">
                    <span>Subtotal</span>
                    <span>{formatCurrency(order.subtotal)}</span>
                  </div>
                  <div className="admin-totals-row">
                    <span>Frete</span>
                    <span>{formatCurrency(order.shipping)}</span>
                  </div>
                  {Number(order.discount) > 0 && (
                    <div className="admin-totals-row admin-totals-row--discount">
                      <span>Desconto{order.coupon_code ? ` (${order.coupon_code})` : ''}</span>
                      <span>−{formatCurrency(order.discount)}</span>
                    </div>
                  )}
                  <div className="admin-totals-row admin-totals-row--total">
                    <span>Total</span>
                    <span>{formatCurrency(order.total)}</span>
                  </div>
                </div>

                {/* ── Observações ── */}
                {(order.observations || order.notes) && (
                  <div className="admin-detail-section">
                    <h3 className="admin-detail-section-title">Observações</h3>
                    <p className="admin-detail-note">
                      {order.observations || order.notes}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {pendingStatus && (
        <ConfirmDialog
          message={
            pendingStatus === 'cancelled'
              ? 'Tem certeza que deseja cancelar este pedido? Esta ação não pode ser desfeita.'
              : `Reverter o status para "${cfgOf(pendingStatus).label}"? O cliente verá essa mudança.`
          }
          onConfirm={() => commitStatusChange(pendingStatus)}
          onCancel={() => setPendingStatus(null)}
        />
      )}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function AdminOrders() {
  const [orders,         setOrders]         = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [selectedId,     setSelectedId]     = useState(null);
  const [filterStatus,   setFilterStatus]   = useState('all');
  const [filterPayment,  setFilterPayment]  = useState('all'); // NEW: filtro por payment_status
  const [search,         setSearch]         = useState('');
  const [toast,          setToast]          = useState(null);
  const [pendingInline,  setPendingInline]  = useState(null);
  const [updatingRows,   setUpdatingRows]   = useState(new Set());
  const searchRef = useRef(null);

  const hasActiveFilters = filterStatus !== 'all' || filterPayment !== 'all' || search.trim();

  function clearFilters() {
    setFilterStatus('all');
    setFilterPayment('all');
    setSearch('');
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    function onKey(e) { if ((e.metaKey || e.ctrlKey) && e.key === 'k') searchRef.current?.focus(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchAllOrders();
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const counts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});

  const filtered = orders.filter((o) => {
    if (filterStatus  !== 'all' && o.status         !== filterStatus)  return false;
    if (filterPayment !== 'all' && o.payment_status !== filterPayment) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      String(o.order_number).includes(q) ||
      o.profiles?.name?.toLowerCase().includes(q)  ||
      o.profiles?.email?.toLowerCase().includes(q) ||
      o.delivery_address?.toLowerCase().includes(q) ||
      o.phone?.includes(q)
    );
  });

  function handleStatusUpdated(orderId, status) {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
  }

  function requestInlineChange(orderId, status, currentStatus) {
    const currentIdx = STATUS_OPTIONS.findIndex((s) => s.value === currentStatus);
    const newIdx = STATUS_OPTIONS.findIndex((s) => s.value === status);
    if (status === 'cancelled' || newIdx < currentIdx) {
      setPendingInline({ orderId, status });
    } else {
      commitInline(orderId, status);
    }
  }

  async function commitInline(orderId, status) {
    setPendingInline(null);
    setUpdatingRows((prev) => new Set(prev).add(orderId));
    try {
      await updateOrderStatus(orderId, status);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
      setToast({ type: 'success', msg: `Pedido atualizado para "${cfgOf(status).label}"` });
    } catch {
      setToast({ type: 'error', msg: 'Erro ao atualizar status.' });
    } finally {
      setUpdatingRows((prev) => { const s = new Set(prev); s.delete(orderId); return s; });
    }
  }

  return (
    <div className="admin-page">
      {/* Global toast */}
      {toast && (
        <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />
      )}

      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Pedidos</h1>
          <p className="admin-page-subtitle">
            {loading ? 'Carregando…' : `${orders.length} pedido(s) · ${filtered.length} exibido(s)`}
          </p>
        </div>
        <button className="admin-btn admin-btn--ghost" onClick={load} disabled={loading}>
          <Icon name={loading ? 'progress_activity' : 'refresh'} size={16} /> Atualizar
        </button>
      </div>

      {/* Search + Payment filter */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="admin-search-wrapper" style={{ flex: 1, minWidth: 220 }}>
          <span className="admin-search-icon">
            <Icon name="search" size={18} style={{ color: '#94a3b8' }} />
          </span>
          <input
            ref={searchRef}
            type="text"
            className="admin-search admin-search--with-icon"
            placeholder="Buscar por nº, cliente, e-mail, telefone… (Ctrl+K)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="admin-search-clear" onClick={() => setSearch('')}>
              <Icon name="close" size={16} />
            </button>
          )}
        </div>

        {/* Filtro por pagamento */}
        <select
          className="admin-select"
          value={filterPayment}
          onChange={(e) => setFilterPayment(e.target.value)}
          style={{ minWidth: 170 }}
        >
          <option value="all">Todos os pagamentos</option>
          {Object.entries(PAYMENT_STATUS_CFG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>

        {/* Limpar filtros */}
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

      {/* Status tabs with counts */}
      <div className="admin-status-tabs">
        <button
          className={`admin-status-tab ${filterStatus === 'all' ? 'active' : ''}`}
          onClick={() => setFilterStatus('all')}
        >
          Todos
          <span className="admin-tab-count">{orders.length}</span>
        </button>
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s.value}
            className={`admin-status-tab ${filterStatus === s.value ? 'active' : ''}`}
            style={filterStatus === s.value ? { borderColor: s.border, color: s.color, background: s.bg } : {}}
            onClick={() => setFilterStatus(s.value)}
          >
            <Icon name={s.icon} size={15} fill style={{ color: filterStatus === s.value ? s.color : undefined }} />
            {s.short}
            {counts[s.value] ? (
              <span
                className="admin-tab-count"
                style={filterStatus === s.value ? { background: s.border, color: s.color } : {}}
              >
                {counts[s.value]}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: 60 }}>#</th>
              <th>Cliente</th>
              <th>Entrega</th>
              <th>Total</th>
              <th>Pedido</th>
              <th>Pagamento</th>
              <th style={{ width: 140 }}>Atualizar</th>
              <th style={{ width: 70 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              : filtered.length === 0
              ? (
                <tr>
                  <td colSpan={8} style={{ padding: 0 }}>
                    <div className="admin-no-results">
                      <Icon name={search ? 'search_off' : 'filter_list_off'} size={36} className="admin-no-results-icon" />
                      <p className="admin-no-results-title">
                        {search ? `Nenhum resultado para "${search}"` : 'Nenhum pedido neste filtro'}
                      </p>
                      <p className="admin-no-results-text">
                        {search
                          ? 'Verifique a grafia ou tente um termo diferente.'
                          : 'Tente alterar os filtros ou limpar todos.'}
                      </p>
                      {hasActiveFilters && (
                        <button className="admin-btn admin-btn--ghost" onClick={clearFilters} style={{ marginTop: 12 }}>
                          <Icon name="filter_list_off" size={16} /> Limpar filtros
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
              : filtered.map((order) => {
                  const isUpdating = updatingRows.has(order.id);
                  return (
                    <tr
                      key={order.id}
                      className={`admin-order-row ${isUpdating ? 'admin-row--updating' : ''}`}
                      onClick={() => setSelectedId(order.id)}
                      title="Clique para ver detalhes"
                    >
                      <td className="admin-table-num">#{order.order_number}</td>
                      <td>
                        <div className="admin-table-name">{order.profiles?.name ?? '—'}</div>
                        <div className="admin-table-sub">
                          {timeAgo(order.created_at)} · {order.delivery_address?.split(',')[0]}
                        </div>
                      </td>
                      <td>
                        <div className="admin-table-name">
                          {order.delivery_date ? formatDateOnly(order.delivery_date) : '—'}
                        </div>
                        <div className="admin-table-sub">{order.delivery_time ?? ''}</div>
                      </td>
                      <td>
                        <strong>{formatCurrency(order.total)}</strong>
                      </td>
                      <td>
                        <StatusBadge status={order.status} />
                      </td>
                      <td>
                        <PaymentBadge status={order.payment_status} />
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {isUpdating ? (
                          <span className="admin-updating-pill">Salvando…</span>
                        ) : (
                          <select
                            className="admin-select admin-select--sm"
                            value={order.status}
                            onChange={(e) =>
                              requestInlineChange(order.id, e.target.value, order.status)
                            }
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s.value} value={s.value}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          className="admin-btn-icon"
                          onClick={() => setSelectedId(order.id)}
                        >
                          Ver →
                        </button>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selectedId && (
        <OrderDetailModal
          orderId={selectedId}
          onClose={() => setSelectedId(null)}
          onStatusUpdated={handleStatusUpdated}
        />
      )}

      {/* Inline confirm */}
      {pendingInline && (
        <ConfirmDialog
          message={
            pendingInline.status === 'cancelled'
              ? 'Cancelar este pedido? O cliente será notificado.'
              : `Reverter para "${cfgOf(pendingInline.status).label}"?`
          }
          onConfirm={() => commitInline(pendingInline.orderId, pendingInline.status)}
          onCancel={() => setPendingInline(null)}
        />
      )}
    </div>
  );
}
