import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchAllOrders, fetchOrderById, updateOrderStatus } from '../services/adminOrders';
import {
  MAX_STOPS_PER_ROUTE,
  buildMapsUrl, callOptimizeRoute, createRoute, createRouteBatch,
  fetchStoreRoutingSettings, generateGroupName, splitOrdersIntoGroups,
} from '../services/adminRoutes';
import { useAuth } from '../../context/AuthContext';
import Icon from '../../components/ui/Icon';

// ─── Config ────────────────────────────────────────────────────────────
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

const MAX_WAYPOINTS = 10; // safe Google Maps limit

// ─── Small helpers ─────────────────────────────────────────────────────
function PaymentBadge({ status }) {
  if (!status) return null;
  const cfg = PAYMENT_STATUS_CFG[status] ?? PAYMENT_STATUS_CFG.pending;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 999,
      fontSize: '0.72rem', fontWeight: 600,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      whiteSpace: 'nowrap',
    }}>
      <Icon name={cfg.icon} size={14} fill style={{ color: cfg.color }} /> {cfg.label}
    </span>
  );
}

const cfgOf = (status) => STATUS_OPTIONS.find(s => s.value === status) ?? STATUS_OPTIONS[0];

function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDateOnly(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

function formatCurrency(v) {
  return Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function timeAgo(d) {
  if (!d) return '';
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `${m}min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

// ─── Sub-components ────────────────────────────────────────────────────
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
      <div className="admin-confirm-box" onClick={e => e.stopPropagation()}>
        <p className="admin-confirm-msg">{message}</p>
        <div className="admin-confirm-actions">
          <button className="admin-btn admin-btn--ghost" onClick={onCancel}>Cancelar</button>
          <button className="admin-btn admin-btn--danger" onClick={onConfirm}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="admin-skeleton-row">
      {[40, 40, 60, 160, 100, 70, 90, 120, 50].map((w, i) => (
        <td key={i}><div className="admin-skeleton" style={{ width: w }} /></td>
      ))}
    </tr>
  );
}

// ─── Order Detail Modal ────────────────────────────────────────────────
function OrderDetailModal({ orderId, onClose, onStatusUpdated }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [toast, setToast] = useState(null);
  const [pendingStatus, setPendingStatus] = useState(null);

  useEffect(() => {
    fetchOrderById(orderId).then(setOrder).catch(console.error).finally(() => setLoading(false));
  }, [orderId]);

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
      setOrder(prev => ({ ...prev, status: newStatus }));
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
    const currentIdx = STATUS_OPTIONS.findIndex(s => s.value === order.status);
    const newIdx     = STATUS_OPTIONS.findIndex(s => s.value === newStatus);
    if (newStatus === 'cancelled' || newIdx < currentIdx) setPendingStatus(newStatus);
    else commitStatusChange(newStatus);
  }

  const cfg = order ? cfgOf(order.status) : null;

  return (
    <>
      <div className="admin-modal-overlay" onClick={onClose}>
        <div className="admin-modal admin-modal--order" onClick={e => e.stopPropagation()}>
          <div className="admin-modal-header admin-modal-header--colored" style={cfg ? { borderBottom: `3px solid ${cfg.border}` } : {}}>
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

          <div className="admin-modal-body">
            {loading ? (
              <div className="admin-modal-skeleton">
                {[180, 140, 200, 160, 220].map((w, i) => (
                  <div key={i} className="admin-skeleton" style={{ width: w, height: 14, marginBottom: 12 }} />
                ))}
              </div>
            ) : (
              <>
                <div className="admin-detail-section">
                  <div className="admin-detail-section-header">
                    <h3 className="admin-detail-section-title">Alterar Status</h3>
                    {updating && <span className="admin-updating-pill">Atualizando…</span>}
                  </div>
                  <div className="admin-status-pipeline">
                    {STATUS_OPTIONS.filter(s => s.value !== 'cancelled').map(s => {
                      const currentIdx = STATUS_OPTIONS.findIndex(x => x.value === order.status);
                      const thisIdx    = STATUS_OPTIONS.findIndex(x => x.value === s.value);
                      const isDone    = thisIdx < currentIdx && order.status !== 'cancelled';
                      const isCurrent = s.value === order.status;
                      return (
                        <button
                          key={s.value}
                          className={`admin-pipeline-step ${isCurrent ? 'current' : ''} ${isDone ? 'done' : ''}`}
                          style={isCurrent ? { borderColor: s.border, background: s.bg, color: s.color } : {}}
                          onClick={() => {
                            if (!isCurrent && !updating) {
                              const ci = STATUS_OPTIONS.findIndex(x => x.value === order.status);
                              const ni = STATUS_OPTIONS.findIndex(x => x.value === s.value);
                              if (ni < ci) setPendingStatus(s.value);
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
                    <button className="admin-cancel-order-btn" onClick={() => setPendingStatus('cancelled')} disabled={updating}>
                      <Icon name="cancel" size={16} fill /> Cancelar pedido
                    </button>
                  )}
                  {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
                </div>

                <div className="admin-detail-section">
                  <h3 className="admin-detail-section-title">Pagamento</h3>
                  <div className="admin-detail-grid">
                    <div className="admin-detail-item"><span className="admin-detail-label">Status</span><PaymentBadge status={order.payment_status} /></div>
                    <div className="admin-detail-item"><span className="admin-detail-label">Método</span><span className="admin-detail-value admin-capitalize">{order.payment_method ?? '—'}</span></div>
                    {order.payment_id && <div className="admin-detail-item"><span className="admin-detail-label">ID MP</span><span className="admin-detail-value" style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{order.payment_id}</span></div>}
                    {order.paid_at && <div className="admin-detail-item"><span className="admin-detail-label">Pago em</span><span className="admin-detail-value">{formatDateTime(order.paid_at)}</span></div>}
                  </div>
                </div>

                <div className="admin-detail-section">
                  <h3 className="admin-detail-section-title">Cliente</h3>
                  <div className="admin-detail-grid">
                    <div className="admin-detail-item"><span className="admin-detail-label">Nome</span><span className="admin-detail-value">{order.profiles?.name ?? '—'}</span></div>
                    <div className="admin-detail-item"><span className="admin-detail-label">Telefone</span><span className="admin-detail-value">{order.phone ?? order.profiles?.phone ?? '—'}</span></div>
                  </div>
                </div>

                <div className="admin-detail-section">
                  <h3 className="admin-detail-section-title">Entrega</h3>
                  <div className="admin-detail-address-card">
                    <div className="admin-detail-address-icon"><Icon name="location_on" size={20} fill style={{ color: '#ef4444' }} /></div>
                    <div>
                      <div className="admin-detail-value">{order.delivery_address}{order.delivery_complement ? `, ${order.delivery_complement}` : ''}</div>
                      {order.neighborhood && <div className="admin-detail-sub">{order.neighborhood}</div>}
                      {order.zip_code     && <div className="admin-detail-sub">CEP {order.zip_code}</div>}
                    </div>
                  </div>
                  <div className="admin-detail-grid" style={{ marginTop: 12 }}>
                    <div className="admin-detail-item">
                      <span className="admin-detail-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="calendar_today" size={14} /> Data prevista</span>
                      <span className="admin-detail-value">{order.delivery_date ? formatDateOnly(order.delivery_date) : '—'}{order.delivery_time ? ` · ${order.delivery_time}` : ''}</span>
                    </div>
                    <div className="admin-detail-item">
                      <span className="admin-detail-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="credit_card" size={14} /> Pagamento</span>
                      <span className="admin-detail-value admin-capitalize">{order.payment_method ?? '—'}</span>
                    </div>
                  </div>
                </div>

                <div className="admin-detail-section">
                  <h3 className="admin-detail-section-title">Itens ({order.order_items?.length ?? 0})</h3>
                  <div className="admin-items-list">
                    {order.order_items?.map(item => (
                      <div key={item.id} className="admin-item-row">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.product_name} className="admin-item-img" />
                        ) : (
                          <div className="admin-item-img-placeholder"><Icon name="inventory_2" size={22} style={{ color: '#94a3b8' }} /></div>
                        )}
                        <div className="admin-item-info">
                          <div className="admin-item-name">{item.product_name}</div>
                          <div className="admin-item-qty">{item.quantity}× {formatCurrency(item.unit_price)}</div>
                        </div>
                        <div className="admin-item-total">{formatCurrency(item.total_price)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="admin-detail-section admin-totals-box">
                  <div className="admin-totals-row"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
                  <div className="admin-totals-row"><span>Frete</span><span>{formatCurrency(order.shipping)}</span></div>
                  {Number(order.discount) > 0 && (
                    <div className="admin-totals-row admin-totals-row--discount">
                      <span>Desconto{order.coupon_code ? ` (${order.coupon_code})` : ''}</span>
                      <span>−{formatCurrency(order.discount)}</span>
                    </div>
                  )}
                  <div className="admin-totals-row admin-totals-row--total"><span>Total</span><span>{formatCurrency(order.total)}</span></div>
                </div>

                {(order.observations || order.notes) && (
                  <div className="admin-detail-section">
                    <h3 className="admin-detail-section-title">Observações</h3>
                    <p className="admin-detail-note">{order.observations || order.notes}</p>
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

// ─── Helpers ──────────────────────────────────────────────────────────
function routeGroupLabel(orders) {
  const neighs = [...new Set(orders.map(o => o.neighborhood).filter(Boolean))];
  return neighs.length === 1 ? neighs[0] : (neighs.slice(0, 2).join('/') || 'Grupo');
}

// ─── Split Route Preview ───────────────────────────────────────────────
function SplitPreviewModal({ orders, storeSettings, onConfirm, onCancel, saving }) {
  const rawGroups  = splitOrdersIntoGroups(orders, MAX_STOPS_PER_ROUTE);
  const [groups, setGroups] = useState(() =>
    rawGroups.map((g, i) => ({
      orders: g,
      name: generateGroupName(g, i + 1, rawGroups.length, null),
    }))
  );

  function rename(idx, val) {
    setGroups(prev => prev.map((g, i) => i === idx ? { ...g, name: val } : g));
  }

  const totalOrders = groups.reduce((s, g) => s + g.orders.length, 0);

  return (
    <div className="admin-modal-overlay" onClick={onCancel}>
      <div className="admin-modal admin-modal--order" onClick={e => e.stopPropagation()}
        style={{ maxWidth: 600, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div className="admin-modal-header admin-modal-header--colored" style={{ borderBottom: '3px solid #fde68a' }}>
          <div className="admin-modal-header-left">
            <span className="admin-order-num" style={{ fontSize: '0.95rem' }}>
              <Icon name="call_split" size={16} style={{ marginRight: 4, verticalAlign: 'middle', color: '#d97706' }} />
              Divisão em múltiplas rotas
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '2px 8px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600,
              background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a',
            }}>
              {totalOrders} pedidos → {groups.length} rotas
            </span>
          </div>
          <button className="admin-modal-close" onClick={onCancel} aria-label="Fechar">
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="admin-modal-body" style={{ flex: 1, overflowY: 'auto' }}>

          {/* Info banner */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            background: '#fffbeb', border: '1px solid #fde68a',
            borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: '0.82rem', color: '#92400e',
          }}>
            <Icon name="info" size={16} fill style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }} />
            <div>
              <strong>{totalOrders} pedidos</strong> excedem o limite de <strong>{MAX_STOPS_PER_ROUTE} paradas por rota</strong>.
              O sistema dividiu em <strong>{groups.length} rotas</strong> por bairro. Você pode renomear cada rota antes de confirmar.
              Cada rota poderá ser otimizada e atribuída a um entregador separado.
            </div>
          </div>

          {/* Group previews */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {groups.map((g, gi) => (
              <div key={gi} style={{
                border: '1px solid #e2e8f0', borderLeft: '4px solid #7c3aed',
                borderRadius: 10, overflow: 'hidden',
              }}>
                {/* Group header */}
                <div style={{
                  background: '#f5f3ff', padding: '10px 14px',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: '#7c3aed', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '0.82rem', flexShrink: 0,
                  }}>{gi + 1}</div>
                  <input
                    className="admin-search"
                    value={g.name}
                    onChange={e => rename(gi, e.target.value)}
                    style={{ flex: 1, fontSize: '0.85rem', fontWeight: 700, background: 'transparent', border: '1px solid #ddd6fe' }}
                    placeholder={`Nome da rota ${gi + 1}`}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {g.orders.length} {g.orders.length === 1 ? 'parada' : 'paradas'}
                  </span>
                </div>

                {/* Orders in group */}
                <div style={{ background: '#fff' }}>
                  {g.orders.map((o, oi) => {
                    const addr = [o.delivery_address, o.neighborhood].filter(Boolean).join(' · ');
                    return (
                      <div key={o.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 14px',
                        borderBottom: oi < g.orders.length - 1 ? '1px solid #f8fafc' : 'none',
                      }}>
                        <span style={{
                          fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8',
                          background: '#f8fafc', border: '1px solid #e2e8f0',
                          borderRadius: 4, padding: '1px 5px', flexShrink: 0,
                        }}>{oi + 1}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#1e293b' }}>
                            #{o.order_number} — {o.profiles?.name ?? '—'}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {addr || '—'}
                          </div>
                        </div>
                        {!o.lat && (
                          <Icon name="location_off" size={13} style={{ color: '#d97706', flexShrink: 0 }} title="Sem geocódigo" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10, flexShrink: 0 }}>
          <button className="admin-btn admin-btn--ghost" onClick={onCancel} style={{ flex: 1 }}>
            Cancelar
          </button>
          <button
            className="admin-btn admin-btn--primary"
            onClick={() => onConfirm(groups)}
            disabled={saving}
            style={{ flex: 2, justifyContent: 'center', background: '#7c3aed', borderColor: '#7c3aed' }}
          >
            <Icon name={saving ? 'progress_activity' : 'check_circle'} size={16} fill />
            {saving ? `Criando rotas…` : `Criar ${groups.length} rotas`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Create Route Modal (single-route flow) ───────────────────────────
function CreateRouteModal({ selectedOrders, allOrders, onClose, onCreated }) {
  const { profile } = useAuth();

  const orders = allOrders.filter(o => selectedOrders.has(o.id));
  const [stops, setStops]       = useState(orders);
  const [name,  setName]        = useState(() => {
    const dates = [...new Set(orders.map(o => o.delivery_date).filter(Boolean))];
    if (dates.length === 1) {
      const d = new Date(dates[0] + 'T00:00:00');
      return `Rota ${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
    }
    return 'Rota de entrega';
  });

  const [mapsUrl,       setMapsUrl]       = useState('');
  const [storeSettings, setStoreSettings] = useState({ city: 'Alagoinhas', lat: null, lng: null, address: '' });
  const [optimizing,    setOptimizing]    = useState(false);
  const [optimized,     setOptimized]     = useState(false);   // true after API success
  const [optMeta,       setOptMeta]       = useState(null);    // { total_distance_text, total_duration_text, legs[] }
  const [saving,        setSaving]        = useState(false);
  const [copied,        setCopied]        = useState(false);
  const [error,         setError]         = useState('');
  const [optError,      setOptError]      = useState('');
  const [step,          setStep]          = useState('review'); // 'review' | 'generated'

  const MAX_API_STOPS  = 24;  // origin + 23 waypoints + destination = 25 total
  const MAX_LINK_STOPS = 10;  // safe Google Maps URL limit

  const nonPreparing   = stops.filter(o => o.status !== 'preparing');
  const missingAddr    = stops.filter(o => !o.delivery_address);
  const missingCoords  = stops.filter(o => !o.lat || !o.lng);
  const canOptimize    = missingCoords.length === 0 && stops.length >= 2 && stops.length <= MAX_API_STOPS;
  const overLinkLimit  = stops.length > MAX_LINK_STOPS;
  const overApiLimit   = stops.length > MAX_API_STOPS;

  useEffect(() => {
    fetchStoreRoutingSettings().then(setStoreSettings).catch(() => {});
  }, []);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Reset optimization when stops change manually
  function moveStop(idx, dir) {
    setStops(prev => {
      const next   = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
    setOptimized(false);
    setOptMeta(null);
    setOptError('');
  }

  function removeStop(id) {
    setStops(prev => prev.filter(o => o.id !== id));
    setOptimized(false);
    setOptMeta(null);
  }

  // ─── Optimize via Edge Function ────────────────────────────────────
  async function handleOptimize() {
    setOptimizing(true);
    setOptError('');
    try {
      const result = await callOptimizeRoute({
        stops: stops.map(s => ({ order_id: s.id, lat: s.lat, lng: s.lng, delivery_address: s.delivery_address })),
        originLat:     storeSettings.lat   ?? undefined,
        originLng:     storeSettings.lng   ?? undefined,
        originAddress: storeSettings.address || storeSettings.city || undefined,
        departureTime: new Date().toISOString(),
      });

      // Reorder stops according to optimized_order
      const orderedIds = result.optimized_order; // string[]
      const stopMap    = Object.fromEntries(stops.map(s => [s.id, s]));
      const newStops   = orderedIds.map(id => stopMap[id]).filter(Boolean);

      setStops(newStops);
      setOptMeta(result);
      setOptimized(true);
      setMapsUrl(result.maps_url); // use coords-based URL from API
    } catch (e) {
      const msg = e.code === 'TOO_MANY_STOPS'
        ? `Máximo de ${MAX_API_STOPS} paradas por otimização. Remova ${stops.length - MAX_API_STOPS} pedido(s).`
        : e.code === 'MISSING_COORDINATES'
        ? 'Alguns pedidos não têm coordenadas. Geocodifique-os primeiro em Geocódigos.'
        : e.message ?? 'Falha na otimização. A ordem manual foi mantida.';
      setOptError(msg);
    } finally {
      setOptimizing(false);
    }
  }

  // ─── Generate link (manual fallback / or after optimization) ──────
  function handleGenerate() {
    setError('');
    if (stops.length < 1)     { setError('Adicione ao menos 1 pedido.'); return; }
    if (overLinkLimit && !optimized) { setError(`Máximo de ${MAX_LINK_STOPS} paradas para link manual. Otimize a rota primeiro (até ${MAX_API_STOPS} paradas) ou remova pedidos.`); return; }
    if (missingAddr.length > 0) { setError('Alguns pedidos não têm endereço completo.'); return; }

    if (!optimized) {
      // Fallback: text-address based URL
      const url = buildMapsUrl(stops, storeSettings.city);
      setMapsUrl(url);
    }
    // If optimized, mapsUrl already set by handleOptimize
    setStep('generated');
  }

  // ─── Save route ────────────────────────────────────────────────────
  async function handleConfirm() {
    setSaving(true);
    setError('');
    try {
      const firstDate = stops.find(o => o.delivery_date)?.delivery_date ?? new Date().toISOString().slice(0, 10);

      const legMap = optMeta?.legs ? Object.fromEntries(optMeta.legs.map(l => [l.order_id, l])) : {};

      await createRoute({
        name,
        deliveryDate: firstDate,
        stops: stops.map(s => ({
          order_id:           s.id,
          estimated_arrival:  legMap[s.id]?.estimated_arrival  ?? null,
          distance_from_prev: legMap[s.id]?.distance_text      ?? null,
          duration_from_prev: legMap[s.id]?.duration_text      ?? null,
        })),
        mapsUrl,
        createdBy:     profile.id,
        isOptimized:   optimized,
        routeMetadata: optMeta ? {
          total_distance:  optMeta.total_distance_text,
          total_duration:  optMeta.total_duration_text,
          total_meters:    optMeta.total_distance_meters,
          total_seconds:   optMeta.total_duration_seconds,
          waypoint_order:  optMeta.waypoint_order,
        } : null,
      });
      onCreated();
    } catch (e) {
      setError(e.message ?? 'Erro ao criar rota.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(mapsUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div
        className="admin-modal admin-modal--order"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 580, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="admin-modal-header admin-modal-header--colored" style={{ borderBottom: '3px solid #ddd6fe' }}>
          <div className="admin-modal-header-left">
            <span className="admin-order-num" style={{ fontSize: '0.95rem' }}>
              <Icon name="route" size={16} style={{ marginRight: 4, verticalAlign: 'middle', color: '#7c3aed' }} />
              {step === 'review' ? 'Criar nova rota' : 'Rota gerada'}
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '2px 8px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600,
              background: optimized ? '#ecfdf5' : '#f5f3ff',
              color:      optimized ? '#059669' : '#7c3aed',
              border: `1px solid ${optimized ? '#a7f3d0' : '#ddd6fe'}`,
            }}>
              {optimized && <Icon name="auto_awesome" size={12} fill style={{ color: '#059669' }} />}
              {stops.length} {stops.length === 1 ? 'parada' : 'paradas'}
              {optimized && ' · Otimizada'}
            </span>
          </div>
          <button className="admin-modal-close" onClick={onClose} aria-label="Fechar">
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="admin-modal-body" style={{ flex: 1, overflowY: 'auto' }}>

          {/* Route name */}
          <div className="admin-detail-section">
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Nome da rota
            </label>
            <input
              type="text"
              className="admin-search"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Rota 27/03 - Tarde"
              style={{ width: '100%', fontSize: '0.9rem' }}
            />
          </div>

          {/* Optimization summary (shown after optimization succeeds) */}
          {optimized && optMeta && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: '#ecfdf5', border: '1px solid #a7f3d0',
              borderRadius: 8, padding: '10px 14px', marginBottom: 12,
            }}>
              <Icon name="auto_awesome" size={18} fill style={{ color: '#059669', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#065f46' }}>
                  Rota otimizada pelo Google
                </div>
                <div style={{ fontSize: '0.78rem', color: '#047857', marginTop: 2 }}>
                  ⏱ {optMeta.total_duration_text} · 📍 {optMeta.total_distance_text}
                  {storeSettings.lat && ' · Saindo da loja'}
                </div>
              </div>
              <button
                onClick={() => { setOptimized(false); setOptMeta(null); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600 }}
                title="Desfazer otimização"
              >
                Desfazer
              </button>
            </div>
          )}

          {/* Warnings */}
          {nonPreparing.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              background: '#fffbeb', border: '1px solid #fde68a',
              borderRadius: 8, padding: '10px 12px', marginBottom: 12, fontSize: '0.8rem', color: '#92400e',
            }}>
              <Icon name="warning" size={16} fill style={{ color: '#d97706', flexShrink: 0 }} />
              <span>
                {nonPreparing.length} {nonPreparing.length === 1 ? 'pedido não está' : 'pedidos não estão'} em "Preparando" —&nbsp;
                {nonPreparing.map(o => `#${o.order_number}`).join(', ')}. Serão incluídos mesmo assim.
              </span>
            </div>
          )}

          {missingCoords.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              background: '#f5f3ff', border: '1px solid #ddd6fe',
              borderRadius: 8, padding: '10px 12px', marginBottom: 12, fontSize: '0.8rem', color: '#5b21b6',
            }}>
              <Icon name="location_off" size={16} fill style={{ color: '#7c3aed', flexShrink: 0 }} />
              <span>
                {missingCoords.length} {missingCoords.length === 1 ? 'pedido sem' : 'pedidos sem'} coordenadas —&nbsp;
                {missingCoords.map(o => `#${o.order_number}`).join(', ')}.
                Otimização indisponível para eles. <a href="/admin/geocodificacao" style={{ color: '#7c3aed', fontWeight: 600 }}>Geocodificar →</a>
              </span>
            </div>
          )}

          {overApiLimit && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 8, padding: '10px 12px', marginBottom: 12, fontSize: '0.8rem', color: '#991b1b',
            }}>
              <Icon name="error" size={16} fill style={{ color: '#dc2626', flexShrink: 0 }} />
              <span>Máximo de {MAX_API_STOPS} paradas por otimização. Remova {stops.length - MAX_API_STOPS} pedido(s).</span>
            </div>
          )}

          {!overApiLimit && overLinkLimit && !optimized && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              background: '#fffbeb', border: '1px solid #fde68a',
              borderRadius: 8, padding: '10px 12px', marginBottom: 12, fontSize: '0.8rem', color: '#92400e',
            }}>
              <Icon name="warning" size={16} fill style={{ color: '#d97706', flexShrink: 0 }} />
              <span>
                {stops.length} paradas excedem o limite de {MAX_LINK_STOPS} para link manual.
                Use o botão <strong>Otimizar rota</strong> para gerar um link preciso via API (até {MAX_API_STOPS} paradas).
              </span>
            </div>
          )}

          {/* Optimization error */}
          {optError && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 8, padding: '10px 12px', marginBottom: 12, fontSize: '0.8rem', color: '#991b1b',
            }}>
              <Icon name="error" size={16} fill style={{ color: '#dc2626', flexShrink: 0 }} />
              <div>
                <strong>Otimização falhou:</strong> {optError}
                <div style={{ marginTop: 3, color: '#b91c1c' }}>Você pode continuar com a ordem manual.</div>
              </div>
            </div>
          )}

          {/* Stops list */}
          <div className="admin-detail-section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <h3 className="admin-detail-section-title" style={{ margin: 0 }}>Paradas</h3>
              {step === 'review' && canOptimize && !optimizing && (
                <button
                  className="admin-btn admin-btn--ghost"
                  onClick={handleOptimize}
                  style={{ fontSize: '0.78rem', padding: '5px 12px', borderColor: '#7c3aed', color: '#7c3aed' }}
                >
                  <Icon name="auto_awesome" size={14} fill style={{ color: '#7c3aed' }} />
                  Otimizar rota
                </button>
              )}
              {optimizing && (
                <span style={{ fontSize: '0.78rem', color: '#7c3aed', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600 }}>
                  <Icon name="progress_activity" size={14} style={{ animation: 'admin-spin 0.8s linear infinite' }} />
                  Otimizando…
                </span>
              )}
              {!canOptimize && missingCoords.length > 0 && !optimizing && step === 'review' && (
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Geocodifique para otimizar</span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {stops.map((order, idx) => {
                const addr    = [order.delivery_address, order.delivery_complement, order.neighborhood].filter(Boolean).join(', ');
                const hasAddr = !!order.delivery_address;
                const legData = optMeta?.legs?.find(l => l.order_id === order.id);
                return (
                  <div key={order.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 8,
                    border: `1px solid ${hasAddr ? (optimized ? '#a7f3d0' : '#e2e8f0') : '#fecaca'}`,
                    background: hasAddr ? (optimized ? '#f0fdf4' : '#f8fafc') : '#fef2f2',
                    transition: 'all 0.2s ease',
                  }}>
                    {/* Stop number */}
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                      background: optimized ? '#059669' : '#7c3aed', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: '0.78rem',
                    }}>
                      {idx + 1}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                        #{order.order_number} — {order.profiles?.name ?? '—'}
                        {!order.lat && <Icon name="location_off" size={12} style={{ color: '#94a3b8' }} title="Sem geocódigo" />}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: hasAddr ? '#64748b' : '#dc2626', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {hasAddr ? addr : '⚠ Endereço incompleto'}
                      </div>
                      {legData && (
                        <div style={{ fontSize: '0.72rem', color: '#059669', marginTop: 3, display: 'flex', gap: 10 }}>
                          <span>⏱ {legData.estimated_arrival}</span>
                          <span>📍 {legData.distance_text} ({legData.duration_text})</span>
                        </div>
                      )}
                    </div>

                    {/* Reorder + remove (only in review step) */}
                    {step === 'review' && (
                      <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                        <button onClick={() => moveStop(idx, -1)} disabled={idx === 0}
                          style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.3 : 1, padding: 4, borderRadius: 4 }} title="Mover acima">
                          <Icon name="arrow_upward" size={16} style={{ color: '#475569' }} />
                        </button>
                        <button onClick={() => moveStop(idx, 1)} disabled={idx === stops.length - 1}
                          style={{ background: 'none', border: 'none', cursor: idx === stops.length - 1 ? 'default' : 'pointer', opacity: idx === stops.length - 1 ? 0.3 : 1, padding: 4, borderRadius: 4 }} title="Mover abaixo">
                          <Icon name="arrow_downward" size={16} style={{ color: '#475569' }} />
                        </button>
                        <button onClick={() => removeStop(order.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4 }} title="Remover parada">
                          <Icon name="close" size={16} style={{ color: '#94a3b8' }} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Generated link */}
          {step === 'generated' && mapsUrl && (
            <div className="admin-detail-section">
              <h3 className="admin-detail-section-title" style={{ color: '#059669' }}>
                <Icon name="check_circle" size={16} fill style={{ marginRight: 4, verticalAlign: 'middle' }} />
                {optimized ? 'Rota otimizada gerada!' : 'Link gerado!'}
              </h3>
              {optimized && optMeta && (
                <div style={{
                  display: 'flex', gap: 20, background: '#ecfdf5', border: '1px solid #a7f3d0',
                  borderRadius: 8, padding: '10px 14px', marginBottom: 10, fontSize: '0.82rem', color: '#065f46',
                }}>
                  <span>⏱ <strong>{optMeta.total_duration_text}</strong></span>
                  <span>📍 <strong>{optMeta.total_distance_text}</strong></span>
                  <span>🛑 <strong>{stops.length} paradas</strong></span>
                </div>
              )}
              <div style={{
                background: '#f8fafc', border: '1px solid #e2e8f0',
                borderRadius: 8, padding: '10px 12px',
                fontFamily: 'monospace', fontSize: '0.68rem',
                color: '#475569', wordBreak: 'break-all',
                maxHeight: 72, overflow: 'hidden', marginBottom: 10,
              }}>
                {mapsUrl}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className={`admin-btn ${copied ? 'admin-btn--success' : 'admin-btn--ghost'}`} onClick={handleCopy} style={{ flex: 1 }}>
                  <Icon name={copied ? 'check' : 'content_copy'} size={15} />
                  {copied ? 'Copiado!' : 'Copiar link'}
                </button>
                <a href={mapsUrl} target="_blank" rel="noreferrer" className="admin-btn admin-btn--ghost">
                  <Icon name="open_in_new" size={15} /> Abrir
                </a>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 8, padding: '10px 12px', fontSize: '0.82rem', color: '#991b1b',
            }}>
              <Icon name="error" size={16} fill style={{ color: '#dc2626', flexShrink: 0 }} />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10, flexShrink: 0 }}>
          <button className="admin-btn admin-btn--ghost" onClick={onClose} style={{ flex: 1 }}>Cancelar</button>
          {step === 'review' ? (
            <button
              className="admin-btn admin-btn--primary"
              onClick={handleGenerate}
              disabled={stops.length < 1 || (overLinkLimit && !optimized && !canOptimize) || overApiLimit || missingAddr.length > 0}
              style={{ flex: 2, justifyContent: 'center' }}
            >
              <Icon name={optimized ? 'auto_awesome' : 'route'} size={16} fill={optimized} />
              {optimized ? 'Ver rota otimizada' : 'Gerar link da rota'}
            </button>
          ) : (
            <button
              className="admin-btn admin-btn--primary"
              onClick={handleConfirm}
              disabled={saving}
              style={{ flex: 2, justifyContent: 'center', background: '#059669', borderColor: '#059669' }}
            >
              <Icon name={saving ? 'progress_activity' : 'check_circle'} size={16} fill />
              {saving ? 'Salvando rota…' : 'Confirmar e salvar rota'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Floating action bar ───────────────────────────────────────────────
function SelectionBar({ count, onCreateRoute, onClear, willSplit }) {
  const routeCount = willSplit ? Math.ceil(count / MAX_STOPS_PER_ROUTE) : 1;
  return (
    <div style={{
      position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
      zIndex: 1000, display: 'flex', alignItems: 'center', gap: 12,
      background: '#1e293b', borderRadius: 14,
      padding: '12px 20px', boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
      animation: 'fadeSlideUp 0.18s ease',
    }}>
      <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.88rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon name="check_box" size={16} style={{ verticalAlign: 'middle', color: '#7c3aed' }} />
        {count} {count === 1 ? 'pedido selecionado' : 'pedidos selecionados'}
        {willSplit && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            background: '#fef3c7', color: '#92400e',
            borderRadius: 99, padding: '2px 8px', fontSize: '0.72rem', fontWeight: 700,
          }}>
            <Icon name="call_split" size={12} style={{ color: '#d97706' }} />
            ÷ {routeCount} rotas
          </span>
        )}
      </div>
      <button
        onClick={onCreateRoute}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          background: willSplit ? '#d97706' : '#7c3aed',
          color: '#fff', border: 'none',
          borderRadius: 9, padding: '8px 16px', fontWeight: 700,
          fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = willSplit ? '#b45309' : '#6d28d9'}
        onMouseLeave={e => e.currentTarget.style.background = willSplit ? '#d97706' : '#7c3aed'}
      >
        <Icon name={willSplit ? 'call_split' : 'route'} size={16} />
        {willSplit ? `Dividir em ${routeCount} rotas` : `Criar rota com ${count} ${count === 1 ? 'pedido' : 'pedidos'}`}
      </button>
      <button
        onClick={onClear}
        style={{
          background: 'none', border: '1px solid rgba(255,255,255,0.15)',
          color: '#94a3b8', borderRadius: 8, padding: '7px 12px',
          cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 5,
        }}
      >
        <Icon name="close" size={14} /> Limpar
      </button>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────
export default function AdminOrders() {
  const [orders,         setOrders]         = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [selectedId,     setSelectedId]     = useState(null);
  const [filterStatus,   setFilterStatus]   = useState('all');
  const [filterPayment,  setFilterPayment]  = useState('all');
  const [search,         setSearch]         = useState('');
  const [toast,          setToast]          = useState(null);
  const [pendingInline,  setPendingInline]  = useState(null);
  const [updatingRows,   setUpdatingRows]   = useState(new Set());
  const [selection,       setSelection]      = useState(new Set()); // multi-select
  const [showRouteModal,  setShowRouteModal]  = useState(false);
  const [showSplitModal,  setShowSplitModal]  = useState(false);
  const [savingBatch,     setSavingBatch]     = useState(false);
  const searchRef = useRef(null);

  const hasActiveFilters = filterStatus !== 'all' || filterPayment !== 'all' || search.trim();

  function clearFilters() { setFilterStatus('all'); setFilterPayment('all'); setSearch(''); }

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

  const counts = orders.reduce((acc, o) => { acc[o.status] = (acc[o.status] ?? 0) + 1; return acc; }, {});

  const filtered = orders.filter(o => {
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
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
  }

  function requestInlineChange(orderId, status, currentStatus) {
    const ci = STATUS_OPTIONS.findIndex(s => s.value === currentStatus);
    const ni = STATUS_OPTIONS.findIndex(s => s.value === status);
    if (status === 'cancelled' || ni < ci) setPendingInline({ orderId, status });
    else commitInline(orderId, status);
  }

  async function commitInline(orderId, status) {
    setPendingInline(null);
    setUpdatingRows(prev => new Set(prev).add(orderId));
    try {
      await updateOrderStatus(orderId, status);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
      setToast({ type: 'success', msg: `Pedido atualizado para "${cfgOf(status).label}"` });
    } catch {
      setToast({ type: 'error', msg: 'Erro ao atualizar status.' });
    } finally {
      setUpdatingRows(prev => { const s = new Set(prev); s.delete(orderId); return s; });
    }
  }

  // ── Multi-select helpers ──
  function toggleSelect(id, e) {
    e.stopPropagation();
    setSelection(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selection.size === filtered.length) {
      setSelection(new Set());
    } else {
      setSelection(new Set(filtered.map(o => o.id)));
    }
  }

  function handleRouteCreated() {
    setShowRouteModal(false);
    setShowSplitModal(false);
    setSelection(new Set());
    setToast({ type: 'success', msg: 'Rota criada! Pedidos marcados como "Entregando".' });
    load();
  }

  async function handleBatchCreated(groups) {
    setSavingBatch(true);
    try {
      const storeSettings = await fetchStoreRoutingSettings();
      const batchGroups = groups.map(g => ({
        name:         g.name,
        deliveryDate: g.orders.find(o => o.delivery_date)?.delivery_date ?? new Date().toISOString().slice(0, 10),
        stops:        g.orders.map(o => ({ order_id: o.id })),
        mapsUrl:      buildMapsUrl(g.orders, storeSettings.city),
        isOptimized:  false,
        routeMetadata: null,
      }));
      await createRouteBatch({ groups: batchGroups, createdBy: profile.id });
      setShowSplitModal(false);
      setSelection(new Set());
      setToast({ type: 'success', msg: `${groups.length} rotas criadas! Pedidos marcados como "Entregando".` });
      load();
    } catch (e) {
      setToast({ type: 'error', msg: e.message ?? 'Erro ao criar rotas.' });
    } finally {
      setSavingBatch(false);
    }
  }

  function handleOpenRoute() {
    const selected = orders.filter(o => selection.has(o.id));
    if (selected.length > MAX_STOPS_PER_ROUTE) {
      setShowSplitModal(true);
    } else {
      setShowRouteModal(true);
    }
  }

  const allFilteredSelected = filtered.length > 0 && filtered.every(o => selection.has(o.id));

  return (
    <div className="admin-page">
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      {/* Split modal */}
      {showSplitModal && (
        <SplitPreviewModal
          orders={orders.filter(o => selection.has(o.id))}
          onCancel={() => setShowSplitModal(false)}
          onConfirm={handleBatchCreated}
          saving={savingBatch}
        />
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
          <span className="admin-search-icon"><Icon name="search" size={18} style={{ color: '#94a3b8' }} /></span>
          <input
            ref={searchRef}
            type="text"
            className="admin-search admin-search--with-icon"
            placeholder="Buscar por nº, cliente, e-mail, telefone… (Ctrl+K)"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="admin-search-clear" onClick={() => setSearch('')}>
              <Icon name="close" size={16} />
            </button>
          )}
        </div>
        <select className="admin-select" value={filterPayment} onChange={e => setFilterPayment(e.target.value)} style={{ minWidth: 170 }}>
          <option value="all">Todos os pagamentos</option>
          {Object.entries(PAYMENT_STATUS_CFG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
        {hasActiveFilters && (
          <button className="admin-btn admin-btn--ghost" onClick={clearFilters} style={{ whiteSpace: 'nowrap' }}>
            <Icon name="filter_list_off" size={16} /> Limpar filtros
          </button>
        )}
      </div>

      {/* Status tabs */}
      <div className="admin-status-tabs">
        <button className={`admin-status-tab ${filterStatus === 'all' ? 'active' : ''}`} onClick={() => setFilterStatus('all')}>
          Todos <span className="admin-tab-count">{orders.length}</span>
        </button>
        {STATUS_OPTIONS.map(s => (
          <button
            key={s.value}
            className={`admin-status-tab ${filterStatus === s.value ? 'active' : ''}`}
            style={filterStatus === s.value ? { borderColor: s.border, color: s.color, background: s.bg } : {}}
            onClick={() => setFilterStatus(s.value)}
          >
            <Icon name={s.icon} size={15} fill style={{ color: filterStatus === s.value ? s.color : undefined }} />
            {s.short}
            {counts[s.value] ? (
              <span className="admin-tab-count" style={filterStatus === s.value ? { background: s.border, color: s.color } : {}}>
                {counts[s.value]}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Selection hint */}
      {selection.size === 0 && !loading && filtered.length > 0 && (
        <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 4 }}>
          <Icon name="check_box_outline_blank" size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
          Use os checkboxes para selecionar pedidos e criar uma rota de entrega.
        </div>
      )}

      {/* Table */}
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: 44 }}>
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={toggleSelectAll}
                  style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#7c3aed' }}
                  title="Selecionar todos visíveis"
                />
              </th>
              <th style={{ width: 60 }}>#</th>
              <th>Cliente</th>
              <th>Entrega</th>
              <th>Total</th>
              <th>Pedido</th>
              <th>Pagamento</th>
              <th style={{ width: 32 }} title="Geocodificado?"><Icon name="my_location" size={14} style={{ color: '#94a3b8' }} /></th>
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
                  <td colSpan={9} style={{ padding: 0 }}>
                    <div className="admin-no-results">
                      <Icon name={search ? 'search_off' : 'filter_list_off'} size={36} className="admin-no-results-icon" />
                      <p className="admin-no-results-title">
                        {search ? `Nenhum resultado para "${search}"` : 'Nenhum pedido neste filtro'}
                      </p>
                      <p className="admin-no-results-text">
                        {search ? 'Verifique a grafia ou tente um termo diferente.' : 'Tente alterar os filtros ou limpar todos.'}
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
              : filtered.map(order => {
                  const isUpdating  = updatingRows.has(order.id);
                  const isSelected  = selection.has(order.id);
                  return (
                    <tr
                      key={order.id}
                      className={`admin-order-row ${isUpdating ? 'admin-row--updating' : ''}`}
                      style={isSelected ? { background: '#f5f3ff', outline: '2px solid #ddd6fe' } : {}}
                      onClick={() => setSelectedId(order.id)}
                      title="Clique para ver detalhes"
                    >
                      <td onClick={e => toggleSelect(order.id, e)} style={{ cursor: 'default' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#7c3aed' }}
                        />
                      </td>
                      <td className="admin-table-num">#{order.order_number}</td>
                      <td>
                        <div className="admin-table-name">{order.profiles?.name ?? '—'}</div>
                        <div className="admin-table-sub">{timeAgo(order.created_at)} · {order.delivery_address?.split(',')[0]}</div>
                      </td>
                      <td>
                        <div className="admin-table-name">{order.delivery_date ? formatDateOnly(order.delivery_date) : '—'}</div>
                        <div className="admin-table-sub">{order.delivery_time ?? ''}</div>
                      </td>
                      <td><strong>{formatCurrency(order.total)}</strong></td>
                      <td><StatusBadge status={order.status} /></td>
                      <td><PaymentBadge status={order.payment_status} /></td>
                      <td onClick={e => e.stopPropagation()} title={order.geocoded_at ? `Geocodificado em ${new Date(order.geocoded_at).toLocaleDateString('pt-BR')}` : 'Sem lat/lng — geocodificar na tela Geocódigos'}>
                        <Icon
                          name={order.lat ? 'location_on' : 'location_off'}
                          size={14}
                          fill={!!order.lat}
                          style={{ color: order.lat ? '#059669' : '#e2e8f0', display: 'block', margin: '0 auto' }}
                        />
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        {isUpdating ? (
                          <span className="admin-updating-pill">Salvando…</span>
                        ) : (
                          <select
                            className="admin-select admin-select--sm"
                            value={order.status}
                            onChange={e => requestInlineChange(order.id, e.target.value, order.status)}
                          >
                            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        )}
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <button className="admin-btn-icon" onClick={() => setSelectedId(order.id)}>Ver →</button>
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

      {/* Create Route Modal */}
      {showRouteModal && (
        <CreateRouteModal
          selectedOrders={selection}
          allOrders={orders}
          onClose={() => setShowRouteModal(false)}
          onCreated={handleRouteCreated}
        />
      )}

      {/* Floating selection bar */}
      {selection.size > 0 && !showRouteModal && !showSplitModal && !selectedId && (
        <SelectionBar
          count={selection.size}
          onCreateRoute={handleOpenRoute}
          onClear={() => setSelection(new Set())}
          willSplit={selection.size > MAX_STOPS_PER_ROUTE}
        />
      )}
    </div>
  );
}
