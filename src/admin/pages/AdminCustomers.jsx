import { useCallback, useEffect, useState } from 'react';
import Icon from '../../components/ui/Icon';
import { fetchCustomerList, fetchCustomerOrders } from '../services/adminCustomers';

// ─── Helpers ──────────────────────────────────────────────────────────
function fmtCurrency(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
function avatarInitial(name) {
  return (name ?? '?')[0].toUpperCase();
}

// ─── Status badge ──────────────────────────────────────────────────────
const STATUS_CFG = {
  received:   { label: 'Recebido',   color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', icon: 'mark_email_unread' },
  preparing:  { label: 'Preparando', color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: 'soup_kitchen'      },
  delivering: { label: 'Entregando', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', icon: 'two_wheeler'       },
  delivered:  { label: 'Entregue',   color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', icon: 'check_circle'      },
  cancelled:  { label: 'Cancelado',  color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: 'cancel'            },
};
const PAY_CFG = {
  pending:    { label: 'Aguardando', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  approved:   { label: 'Pago',       color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  in_process: { label: 'Processando',color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  rejected:   { label: 'Recusado',   color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  cancelled:  { label: 'Cancelado',  color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
  refunded:   { label: 'Estornado',  color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' },
};
function StatusBadge({ status }) {
  const c = STATUS_CFG[status] ?? STATUS_CFG.received;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 999, fontSize: '0.72rem',
      fontWeight: 600, background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      whiteSpace: 'nowrap',
    }}>
      <Icon name={c.icon} size={13} fill /> {c.label}
    </span>
  );
}
function PayBadge({ status }) {
  const c = PAY_CFG[status] ?? PAY_CFG.pending;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 999, fontSize: '0.72rem',
      fontWeight: 600, background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      whiteSpace: 'nowrap',
    }}>
      {c.label}
    </span>
  );
}

// ─── Order card inside the customer detail drawer ──────────────────────
function OrderCard({ order }) {
  const [expanded, setExpanded] = useState(false);
  const items = order.order_items ?? [];
  return (
    <div style={{
      border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden',
      background: '#fff', marginBottom: 10,
    }}>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer',
          gap: 12, textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.92rem', flexShrink: 0 }}>
            #{order.order_number}
          </span>
          <StatusBadge status={order.status} />
          <PayBadge status={order.payment_status} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
          <span style={{ fontSize: '0.82rem', color: '#64748b' }}>{fmtDateTime(order.created_at)}</span>
          <span style={{ fontWeight: 700, color: '#059669', fontSize: '0.95rem' }}>
            {fmtCurrency(order.total)}
          </span>
          <Icon name={expanded ? 'expand_less' : 'expand_more'} size={18} style={{ color: '#94a3b8' }} />
        </div>
      </button>

      {expanded && (
        <div style={{ borderTop: '1px solid #f1f5f9', padding: '12px 16px', background: '#f8fafc' }}>
          {/* Items */}
          <div style={{ marginBottom: 12 }}>
            {items.map((it, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '6px 0', borderBottom: i < items.length - 1 ? '1px solid #e2e8f0' : 'none',
                gap: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  {it.image_url ? (
                    <img src={it.image_url} alt={it.product_name} style={{
                      width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0,
                    }} />
                  ) : (
                    <div style={{
                      width: 36, height: 36, borderRadius: 8, background: '#e2e8f0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Icon name="fastfood" size={18} style={{ color: '#94a3b8' }} />
                    </div>
                  )}
                  <span style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 500 }}>
                    {it.quantity}× {it.product_name}
                  </span>
                </div>
                <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.85rem', flexShrink: 0 }}>
                  {fmtCurrency(it.unit_price * it.quantity)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.82rem', color: '#64748b' }}>
            {order.subtotal != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal</span>
                <span>{fmtCurrency(order.subtotal)}</span>
              </div>
            )}
            {order.shipping > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Frete</span>
                <span>{fmtCurrency(order.shipping)}</span>
              </div>
            )}
            {order.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669' }}>
                <span>Desconto{order.coupon_code ? ` (${order.coupon_code})` : ''}</span>
                <span>− {fmtCurrency(order.discount)}</span>
              </div>
            )}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontWeight: 700, color: '#1e293b', fontSize: '0.9rem',
              borderTop: '1px solid #e2e8f0', marginTop: 4, paddingTop: 6,
            }}>
              <span>Total</span>
              <span>{fmtCurrency(order.total)}</span>
            </div>
          </div>

          {/* Address */}
          {order.delivery_address && (
            <div style={{
              marginTop: 10, padding: '8px 12px', background: '#fff',
              borderRadius: 8, border: '1px solid #e2e8f0',
              fontSize: '0.8rem', color: '#64748b',
              display: 'flex', alignItems: 'flex-start', gap: 6,
            }}>
              <Icon name="location_on" size={15} style={{ color: '#94a3b8', marginTop: 1, flexShrink: 0 }} />
              <span>
                {order.delivery_address}
                {order.delivery_complement ? `, ${order.delivery_complement}` : ''}
                {order.neighborhood ? ` — ${order.neighborhood}` : ''}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Customer detail drawer ────────────────────────────────────────────
function CustomerDrawer({ customer, onClose }) {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!customer) return;
    setLoading(true);
    setError(null);
    fetchCustomerOrders(customer.id)
      .then(setOrders)
      .catch(() => setError('Erro ao carregar pedidos.'))
      .finally(() => setLoading(false));
  }, [customer]);

  if (!customer) return null;

  const activeOrders    = orders.filter(o => o.status !== 'cancelled');
  const cancelledOrders = orders.filter(o => o.status === 'cancelled');

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(2px)',
        display: 'flex', justifyContent: 'flex-end',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 560, background: '#fff',
          height: '100%', overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
          boxShadow: '-4px 0 40px rgba(0,0,0,.15)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9',
          display: 'flex', alignItems: 'center', gap: 14,
          position: 'sticky', top: 0, background: '#fff', zIndex: 1,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'linear-gradient(135deg,#16a34a,#22c55e)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: '1.2rem', flexShrink: 0,
          }}>
            {avatarInitial(customer.name)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
              {customer.name}
            </h2>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
              {customer.email}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 6, borderRadius: 8, color: '#64748b',
              display: 'flex', alignItems: 'center',
            }}
          >
            <Icon name="close" size={22} />
          </button>
        </div>

        {/* Stats row */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
          gap: 12, padding: '16px 24px', borderBottom: '1px solid #f1f5f9',
        }}>
          {[
            { label: 'Pedidos',   value: customer.order_count,            icon: 'receipt_long',   color: '#2563eb' },
            { label: 'Total gasto', value: fmtCurrency(customer.total_spent), icon: 'payments',       color: '#059669' },
            { label: 'Último pedido', value: fmtDate(customer.last_order),  icon: 'schedule',       color: '#d97706' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} style={{
              background: '#f8fafc', borderRadius: 10, padding: '10px 12px',
              border: '1px solid #e2e8f0',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Icon name={icon} size={14} style={{ color }} />
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {label}
                </span>
              </div>
              <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Contact */}
        {customer.phone && customer.phone !== '—' && (
          <div style={{ padding: '12px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="phone" size={16} style={{ color: '#94a3b8' }} />
            <a href={`tel:${customer.phone}`} style={{ color: '#2563eb', fontSize: '0.88rem' }}>
              {customer.phone}
            </a>
          </div>
        )}

        {/* Orders */}
        <div style={{ flex: 1, padding: '16px 24px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <div className="spinner" />
            </div>
          ) : error ? (
            <p style={{ color: '#dc2626', fontSize: '0.9rem' }}>{error}</p>
          ) : orders.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Sem pedidos registrados.</p>
          ) : (
            <>
              <div style={{ marginBottom: 14 }}>
                <h3 style={{ margin: '0 0 10px', fontSize: '0.88rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Pedidos ({activeOrders.length})
                </h3>
                {activeOrders.map(o => <OrderCard key={o.id} order={o} />)}
              </div>
              {cancelledOrders.length > 0 && (
                <div>
                  <h3 style={{ margin: '0 0 10px', fontSize: '0.88rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Cancelados ({cancelledOrders.length})
                  </h3>
                  {cancelledOrders.map(o => <OrderCard key={o.id} order={o} />)}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────
export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [selected, setSelected]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchCustomerList();
      setCustomers(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const q = search.toLowerCase();
  const filtered = customers.filter(c =>
    !q ||
    c.name.toLowerCase().includes(q)  ||
    c.email.toLowerCase().includes(q) ||
    (c.phone && c.phone.includes(q))
  );

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Clientes</h1>
          <p className="admin-page-subtitle">
            {loading ? 'Carregando…' : `${customers.length} cliente${customers.length !== 1 ? 's' : ''} com compra confirmada`}
          </p>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20, position: 'relative' }}>
        <Icon name="search" size={18} style={{
          position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
          color: '#94a3b8', pointerEvents: 'none',
        }} />
        <input
          type="search"
          className="admin-search"
          placeholder="Buscar por nome, e-mail ou telefone…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: 42 }}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <div className="spinner" />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          color: '#94a3b8', fontSize: '0.95rem',
        }}>
          <Icon name="person_search" size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
          <p style={{ margin: 0 }}>
            {search ? 'Nenhum cliente encontrado.' : 'Nenhum cliente com compra registrada.'}
          </p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>E-mail / Telefone</th>
                <th style={{ textAlign: 'center' }}>Pedidos</th>
                <th style={{ textAlign: 'right' }}>Total gasto</th>
                <th>Último pedido</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr
                  key={c.id}
                  onClick={() => setSelected(c)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Avatar + name */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg,#16a34a,#22c55e)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 700, fontSize: '0.9rem',
                      }}>
                        {avatarInitial(c.name)}
                      </div>
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>{c.name}</span>
                    </div>
                  </td>

                  {/* Contact */}
                  <td>
                    <div style={{ fontSize: '0.85rem', color: '#334155' }}>{c.email}</div>
                    {c.phone && c.phone !== '—' && (
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 2 }}>{c.phone}</div>
                    )}
                  </td>

                  {/* Order count */}
                  <td style={{ textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 28, height: 28, borderRadius: '50%',
                      background: '#f0fdf4', color: '#16a34a',
                      fontWeight: 700, fontSize: '0.82rem', border: '1px solid #bbf7d0',
                    }}>
                      {c.order_count}
                    </span>
                  </td>

                  {/* Total */}
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                    {fmtCurrency(c.total_spent)}
                  </td>

                  {/* Last order */}
                  <td style={{ color: '#64748b', fontSize: '0.85rem' }}>
                    {fmtDate(c.last_order)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <CustomerDrawer customer={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
