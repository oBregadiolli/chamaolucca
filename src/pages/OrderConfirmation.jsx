import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate, mpPaymentMethod } from '../lib/utils';
import Icon from '../components/ui/Icon';
import PaymentModal from '../components/checkout/PaymentModal';
import '../styles/order-confirmation.css';

/* ── Order status pipeline ────────────────────── */
const STATUS_PIPELINE = [
  { key: 'received',   icon: 'receipt_long',   label: 'Pedido recebido',  desc: 'Confirmamos seu pedido com sucesso' },
  { key: 'preparing',  icon: 'soup_kitchen',   label: 'Em preparação',    desc: 'Estamos separando seus itens'       },
  { key: 'delivering', icon: 'local_shipping', label: 'Em entrega',       desc: 'A caminho da sua casa'              },
  { key: 'delivered',  icon: 'home',           label: 'Entregue',         desc: 'Bom proveito! ッ'                   },
];
const STATUS_IDX = { received: 0, preparing: 1, delivering: 2, delivered: 3 };

const PAYMENT_LABELS = {
  pix:         'Pix',
  credit_card: 'Cartão de crédito',
  debit_card:  'Cartão de débito',
  card:        'Cartão',
  cash:        'Dinheiro na entrega',
};

/* ── Payment status config ────────────────────── */
const PAYMENT_STATUS_UI = {
  pending:    {
    label: 'Aguardando pagamento',
    color: '#d97706', bg: '#fffbeb', icon: 'hourglass_empty',
    desc:  'Finalize o pagamento no Mercado Pago para confirmar seu pedido.',
    canRetry: true,
  },
  approved:   {
    label: 'Pagamento confirmado',
    color: '#059669', bg: '#ecfdf5', icon: 'check_circle',
    desc:  'Pagamento aprovado! Seu pedido está sendo preparado.',
    canRetry: false,
  },
  in_process: {
    label: 'Processando',
    color: '#7c3aed', bg: '#f5f3ff', icon: 'sync',
    desc:  'Seu pagamento está sendo processado pelo Mercado Pago.',
    canRetry: false,
  },
  rejected:   {
    label: 'Pagamento recusado',
    color: '#dc2626', bg: '#fef2f2', icon: 'cancel',
    desc:  'O pagamento foi recusado. Tente novamente com outro método.',
    canRetry: true,
  },
  cancelled:  {
    label: 'Cancelado',
    color: '#64748b', bg: '#f8fafc', icon: 'block',
    desc:  'O pagamento foi cancelado.',
    canRetry: true,
  },
  refunded:   {
    label: 'Reembolsado',
    color: '#0ea5e9', bg: '#f0f9ff', icon: 'currency_exchange',
    desc:  'O valor foi reembolsado.',
    canRetry: false,
  },
};

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <div className="spinner" />
    </div>
  );
}

/* ── Retry button component ───────────────────── */
function RetryPaymentButton({ order, onRetry, retrying }) {
  const ps = PAYMENT_STATUS_UI[order.payment_status ?? 'pending'] ?? PAYMENT_STATUS_UI.pending;
  if (!ps.canRetry || order.status === 'cancelled' || order.payment_status === 'approved') return null;

  return (
    <button
      onClick={onRetry}
      disabled={retrying}
      style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            8,
        width:          '100%',
        padding:        '13px 20px',
        background:     retrying ? '#dcfce7' : '#16a34a',
        color:          retrying ? '#15803d' : '#fff',
        border:         'none',
        borderRadius:   12,
        fontWeight:     700,
        fontSize:       '0.9rem',
        cursor:         retrying ? 'not-allowed' : 'pointer',
        fontFamily:     'inherit',
        transition:     'background 0.2s, opacity 0.2s',
        marginTop:      4,
      }}
    >
      {retrying ? (
        <>
          <div style={{
            width: 16, height: 16,
            border: '2px solid #86efac',
            borderTopColor: '#15803d',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            flexShrink: 0,
          }} />
          Abrindo Mercado Pago…
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
      ) : (
        <>
          <Icon name="refresh" size={18} />
          Tentar pagamento novamente
        </>
      )}
    </button>
  );
}

/* ── Payment status block ─────────────────────── */
function PaymentStatusBlock({ order, polling, onRetry, retrying, retryError }) {
  const ps = PAYMENT_STATUS_UI[order.payment_status ?? 'pending'] ?? PAYMENT_STATUS_UI.pending;
  const isPaid = order.payment_status === 'approved';

  return (
    <div style={{
      background: '#fafafa', border: '1px solid #e2e8f0',
      borderRadius: 14, padding: '18px 20px',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <p className="oc-section-label" style={{ marginBottom: 0 }}>Status do pagamento</p>

      {/* Badge */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        padding: '6px 14px', borderRadius: 999,
        background: ps.bg, color: ps.color, fontWeight: 700, fontSize: '0.85rem',
        border: `1px solid ${ps.color}33`,
        alignSelf: 'flex-start',
      }}>
        <Icon name={ps.icon} size={16} fill style={{ color: ps.color }} />
        {ps.label}
      </div>

      <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
        {ps.desc}
      </p>

      {/* Polling indicator */}
      {polling && !isPaid && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: '0.78rem', color: '#94a3b8',
        }}>
          <div style={{
            width: 12, height: 12, border: '2px solid #e2e8f0',
            borderTopColor: '#16a34a', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', flexShrink: 0,
          }} />
          Verificando status do pagamento…
        </div>
      )}

      {/* Paid timestamp */}
      {isPaid && order.paid_at && (
        <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>
          Pago em {new Date(order.paid_at).toLocaleString('pt-BR')}
        </p>
      )}

      {/* Payment ID for reference */}
      {order.payment_id && !order.payment_id.startsWith('TEST_') && (
        <p style={{ fontSize: '0.75rem', color: '#cbd5e1', margin: 0 }}>
          ID: {order.payment_id}
        </p>
      )}

      {/* Retry button */}
      <RetryPaymentButton order={order} onRetry={onRetry} retrying={retrying} />

      {/* Retry error */}
      {retryError && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fca5a5',
          borderRadius: 8, padding: '10px 14px',
          color: '#b91c1c', fontSize: '0.82rem', display: 'flex', gap: 8, alignItems: 'flex-start',
        }}>
          <Icon name="warning" size={16} style={{ flexShrink: 0, color: '#dc2626', marginTop: 1 }} />
          {retryError}
        </div>
      )}
    </div>
  );
}

/* ── Main page ────────────────────────────────── */
export default function OrderConfirmation() {
  const { id }          = useParams();
  const { user, loading: authLoading } = useAuth();
  const [searchParams]  = useSearchParams();
  const mpStatus        = searchParams.get('mp_status');

  const [order,      setOrder]      = useState(null);
  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [polling,    setPolling]    = useState(false);
  const [retrying,   setRetrying]   = useState(false);
  const [retryError, setRetryError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [mpModalData, setMpModalData] = useState(null);

  const pollRef   = useRef(null);
  const pollCount = useRef(0);

  const loadOrder = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return null;
    }
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();
    if (data) {
      setOrder(data);
      setItems(data.order_items || []);
    }
    setLoading(false);
    return data;
  }, [id, user]);

  // Initial load
  useEffect(() => { loadOrder(); }, [loadOrder]);

  // ── Realtime: auto-update when admin changes status ──
  useEffect(() => {
    if (!id || !user) return;

    const channel = supabase
      .channel(`order-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          console.log('[Realtime] Order updated:', payload.new.status, payload.new.payment_status);
          setOrder((prev) => prev ? { ...prev, ...payload.new } : prev);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, user]);

  // Polling quando volta do MP com status não-aprovado
  useEffect(() => {
    if (!mpStatus || mpStatus === 'failure') return;
    if (!order) return;
    if (order.payment_status === 'approved') return;

    setPolling(true);
    pollCount.current = 0;

    pollRef.current = setInterval(async () => {
      pollCount.current += 1;
      const data = await loadOrder();

      if (data?.payment_status !== 'pending' || pollCount.current >= 20) {
        clearInterval(pollRef.current);
        setPolling(false);
      }
    }, 3000);

    return () => clearInterval(pollRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mpStatus, order?.payment_status]);

  /* ── Retry de pagamento ──────────────────────── */
  async function handleRetryPayment() {
    if (!order || retrying) return;
    setRetrying(true);
    setRetryError(null);

    try {
      const appUrl = window.location.origin;

      // Monta payload de itens a partir dos order_items salvos
      const itemsPayload = items.map((i) => ({
        title:      i.product_name,
        quantity:   i.quantity,
        unit_price: i.unit_price,
      }));

      const { data, error: fnErr } = await supabase.functions.invoke('create-mp-preference', {
        body: {
          order_id:       order.id,
          order_number:   order.order_number,
          items:          itemsPayload,
          payer_email:    user.email ?? `${user.id}@chamaolucca.com.br`,
          payer_name:     'Cliente',
          shipping:       order.shipping  ?? 0,
          discount:       order.discount  ?? 0,
          app_url:        appUrl,
          payment_method: mpPaymentMethod(order.payment_method ?? 'pix'),
        },
      });

      if (fnErr || !data?.ok) {
        const friendly = 'Não conseguimos abrir o pagamento. Tente novamente em instantes.';
        throw new Error(friendly);
      }

      setRetrying(false);
      setMpModalData(data);

    } catch (err) {
      setRetryError(err.message || 'Não foi possível abrir o pagamento. Tente novamente.');
      setRetrying(false);
    }
  }

  if (authLoading || loading) return <Spinner />;

  if (!user) {
    return (
      <div className="oc-page">
        <div className="oc-card" style={{ textAlign: 'center', padding: '56px 28px' }}>
          <Icon name="lock" size={40} style={{ color: '#d1d5db', marginBottom: 12 }} />
          <p style={{ color: '#9ca3af', fontSize: '0.9375rem', marginBottom: 20 }}>
            Faça login para ver os detalhes do seu pedido.
          </p>
          <Link to="/loja" className="oc-btn-primary">Ir para a loja</Link>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="oc-page">
        <div className="oc-card" style={{ textAlign: 'center', padding: '56px 28px' }}>
          <Icon name="search_off" size={40} style={{ color: '#d1d5db', marginBottom: 12 }} />
          <p style={{ color: '#9ca3af', fontSize: '0.9375rem', marginBottom: 20 }}>
            Pedido não encontrado.
          </p>
          <Link to="/loja" className="oc-btn-primary">Ir para a loja</Link>
        </div>
      </div>
    );
  }

  const statusIdx   = STATUS_IDX[order.status] ?? 0;
  const isCancelled = order.status === 'cancelled';
  const isPaid      = order.payment_status === 'approved';

  return (
    <div className="oc-page">
      <div className="oc-card">

        {/* ── Bloco 1: Confirmação ──────────────── */}
        <div className="oc-confirm-block">
          {isCancelled ? (
            <>
              <div className="oc-check-badge" style={{ background: '#fee2e2', color: '#dc2626' }}>
                <Icon name="close" size={22} />
              </div>
              <h1 className="oc-confirm-title">Pedido cancelado</h1>
              <p className="oc-confirm-sub">Este pedido foi cancelado.</p>
            </>
          ) : (
            <>
              <div className="oc-check-badge" style={isPaid ? { background: '#ecfdf5', color: '#059669' } : undefined}>
                <Icon name="check" size={22} />
              </div>
              <h1 className="oc-confirm-title">
                {isPaid ? 'Pedido confirmado 🎉' : 'Pedido recebido'}
              </h1>
              <p className="oc-confirm-sub">
                {isPaid
                  ? 'Pagamento confirmado! Estamos preparando seu pedido.'
                  : 'Seu pedido foi salvo. Complete o pagamento para confirmar.'}
              </p>
            </>
          )}
        </div>

        {/* ── Bloco 2: Status do pagamento ──────── */}
        {!isCancelled && order.payment_provider === 'mercadopago' && (
          <PaymentStatusBlock
            order={order}
            polling={polling}
            onRetry={handleRetryPayment}
            retrying={retrying}
            retryError={retryError}
          />
        )}

        {/* ── Bloco 3: Pipeline de status ───────── */}
        {!isCancelled && (
          <div className="oc-status-block">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p className="oc-section-label" style={{ marginBottom: 0 }}>Acompanhamento</p>
              <button
                type="button"
                onClick={async () => {
                  setRefreshing(true);
                  await loadOrder();
                  setTimeout(() => setRefreshing(false), 600);
                }}
                disabled={refreshing}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: 'none', border: '1px solid #e5e7eb',
                  borderRadius: 8, padding: '5px 10px',
                  fontSize: '0.72rem', fontWeight: 600,
                  color: '#64748b', cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s',
                  marginBottom: 16,
                }}
              >
                <Icon
                  name="refresh"
                  size={13}
                  style={{
                    transition: 'transform 0.4s',
                    transform: refreshing ? 'rotate(360deg)' : 'none',
                  }}
                />
                {refreshing ? 'Atualizando...' : 'Atualizar'}
              </button>
            </div>
            {STATUS_PIPELINE.map((s, i) => {
              const isDone    = i < statusIdx;
              const isActive  = i === statusIdx;
              const isPending = i > statusIdx;
              return (
                <div
                  key={s.key}
                  className={['oc-status-row', isDone ? 'done' : '', isActive ? 'active' : '', isPending ? 'pending' : ''].join(' ')}
                >
                  {i > 0 && <div className={`oc-connector${i <= statusIdx ? ' filled' : ''}`} />}
                  <div className="oc-status-circle">
                    {isDone
                      ? <Icon name="check" size={16} />
                      : <Icon name={s.icon} size={18} fill />}
                  </div>
                  <div className="oc-status-text">
                    <span className="oc-status-name">{s.label}</span>
                    {isActive && <span className="oc-status-desc">{s.desc}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Bloco 4: Info do pedido ───────────── */}
        <div className="oc-info-block">
          <p className="oc-section-label">Detalhes do pedido</p>

          <div className="oc-info-row">
            <span>Número</span>
            <strong>#{order.order_number ?? order.id.slice(0, 8).toUpperCase()}</strong>
          </div>

          {order.delivery_date && (
            <div className="oc-info-row">
              <span>Data</span>
              <strong>{formatDate(order.delivery_date)}</strong>
            </div>
          )}

          {order.delivery_time && (
            <div className="oc-info-row">
              <span>Horário</span>
              <strong>
                {order.delivery_time === 'express'
                  ? (order.status === 'delivered'
                      ? `Entregue às ${new Date(order.updated_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                      : 'Entrega expressa')
                  : order.delivery_time.replace('-', ' às ')}
              </strong>
            </div>
          )}

          <div className="oc-info-row">
            <span>Endereço</span>
            <strong style={{ textAlign: 'right', maxWidth: '55%' }}>
              {order.delivery_address}
            </strong>
          </div>

          <div className="oc-info-row">
            <span>Pagamento</span>
            <strong>{PAYMENT_LABELS[order.payment_method] || order.payment_method}</strong>
          </div>

          {items.length > 0 && (
            <>
              <div className="oc-info-divider" />
              {items.map((item) => (
                <div key={item.id} className="oc-info-row item">
                  <span style={{ color: '#6b7280' }}>{item.product_name} ×{item.quantity}</span>
                  <span>{formatCurrency(item.unit_price * item.quantity)}</span>
                </div>
              ))}
              <div className="oc-info-divider" />
            </>
          )}

          <div className="oc-info-row total">
            <span>Total</span>
            <strong>{formatCurrency(order.total)}</strong>
          </div>
        </div>

        {/* ── Bloco 5: Ações ───────────────────── */}
        <Link to="/" className="oc-btn-primary">Voltar para início</Link>

      </div>

      {/* ── Mercado Pago Web Modal ── */}
      {mpModalData && (
        <PaymentModal
          url={mpModalData.checkout_url}
          pixData={mpModalData}
          onClose={() => setMpModalData(null)}
        />
      )}
    </div>
  );
}
