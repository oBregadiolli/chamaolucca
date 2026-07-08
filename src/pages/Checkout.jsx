import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';
import { CheckoutProvider, useCheckout, CHECKOUT_STEPS } from '../context/CheckoutContext';
import { supabase } from '../lib/supabase';
import { mpPaymentMethod } from '../lib/utils';
import AddressStep from '../components/checkout/AddressStep';
import ScheduleStep from '../components/checkout/ScheduleStep';
import PaymentStep from '../components/checkout/PaymentStep';
import ReviewStep from '../components/checkout/ReviewStep';
import AuthModal from '../components/auth/AuthModal';
import { ClosedStoreDialog } from '../components/ui/StoreDialogs';
import Icon from '../components/ui/Icon';
import { usePageTitle } from '../hooks/usePageTitle';
import mpLogo from '../assets/mercadopagologo.png';
import '../styles/checkout-steps.css';

const STEP_META = [
  { key: CHECKOUT_STEPS.ADDRESS,      label: 'Endereço'    },
  { key: CHECKOUT_STEPS.SCHEDULE,     label: 'Agendamento' },
  { key: CHECKOUT_STEPS.PAYMENT,      label: 'Pagamento'   },
  { key: CHECKOUT_STEPS.CONFIRMATION, label: 'Revisão'     },
];

/* ── Payment error screen ─────────────────────────── */
function PaymentErrorScreen({ message, orderId, orderNumber, onRetry, retrying }) {
  const navigate = useNavigate();
  return (
    <div style={{
      minHeight: '60vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '24px 16px',
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      <div style={{
        background: '#fff', borderRadius: 20,
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        padding: '36px 28px', maxWidth: 400, width: '100%',
        textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <div>
          <Icon name="warning" size={40} fill style={{ color: '#f59e0b' }} />
        </div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
          Falha ao abrir o pagamento
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
          {message}
        </p>
        <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
          Seu pedido #{orderNumber} foi salvo. Tente novamente para ir ao pagamento.
        </p>
        <button
          onClick={onRetry}
          disabled={retrying}
          style={{
            padding: '12px', background: '#16a34a', color: '#fff',
            border: 'none', borderRadius: 10, fontWeight: 700,
            fontSize: '0.9rem', cursor: retrying ? 'not-allowed' : 'pointer',
            opacity: retrying ? 0.7 : 1, fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <Icon name="refresh" size={18} />
          {retrying ? 'Abrindo...' : 'Tentar novamente'}
        </button>
        <button
          onClick={() => navigate(`/pedido/${orderId}`)}
          style={{
            background: 'none', border: 'none', color: '#94a3b8',
            fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Ver meu pedido sem pagar agora
        </button>
      </div>
    </div>
  );
}

/* ── Redirect screen — premium overlay ───────────────── */
function RedirectingScreen() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animate progress bar: fast at first, then slow down before 90%
    const intervals = [
      { target: 30, duration: 400 },
      { target: 60, duration: 600 },
      { target: 85, duration: 1200 },
    ];
    let current = 0;
    const timers = [];
    intervals.forEach(({ target, duration }) => {
      const steps = 20;
      const stepTime = duration / steps;
      const increment = (target - current) / steps;
      for (let i = 0; i < steps; i++) {
        timers.push(setTimeout(() => {
          setProgress(p => Math.min(p + increment, 95));
        }, current + stepTime * i));
      }
      current += duration;
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <>
      <style>{`
        @keyframes mp-fadein {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes mp-dot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
          40%            { transform: scale(1);   opacity: 1; }
        }
        @keyframes mp-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes mp-pulse-ring {
          0%   { transform: scale(0.9); opacity: 0.6; }
          70%  { transform: scale(1.15); opacity: 0; }
          100% { transform: scale(0.9); opacity: 0; }
        }
      `}</style>

      {/* Backdrop */}
      <div style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}>
        {/* Card */}
        <div style={{
          background: '#fff',
          borderRadius: 24,
          boxShadow: '0 32px 80px rgba(0,0,0,0.22)',
          padding: '44px 36px',
          maxWidth: 400, width: '100%',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28,
          animation: 'mp-fadein 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
          fontFamily: "'Inter', -apple-system, sans-serif",
        }}>

          {/* Pulsing ring + logo */}
          <div style={{ position: 'relative', width: 88, height: 88 }}>
            <div style={{
              position: 'absolute', inset: 0,
              borderRadius: '50%',
              border: '3px solid #009ee3',
              animation: 'mp-pulse-ring 1.6s ease-out infinite',
            }} />
            <div style={{
              position: 'absolute', inset: 6,
              background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}>
              <img
                src={mpLogo}
                alt="Mercado Pago"
                style={{ width: 56, height: 'auto', objectFit: 'contain' }}
              />
            </div>
          </div>

          {/* Text */}
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Redirecionando para Mercado Pago
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
              Aguarde um instante. Você será levado à página de pagamento com segurança.
            </p>
          </div>

          {/* Progress bar */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{
              width: '100%', height: 8,
              background: '#e2e8f0',
              borderRadius: 999, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                borderRadius: 999,
                background: 'linear-gradient(90deg, #009ee3 0%, #00c4f4 40%, #009ee3 100%)',
                backgroundSize: '200% auto',
                animation: 'mp-shimmer 1.5s linear infinite',
                transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1)',
              }} />
            </div>

            {/* Bouncing dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 4 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 8, height: 8,
                  background: '#009ee3',
                  borderRadius: '50%',
                  animation: `mp-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
          </div>

          {/* Security badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#f0fdf4', borderRadius: 10,
            padding: '10px 16px',
          }}>
            <span className="material-symbols-rounded" style={{ color: '#16a34a', fontSize: '1.1rem' }}>lock</span>
            <span style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: 600 }}>
              Conexão segura • Criptografada
            </span>
          </div>

        </div>
      </div>
    </>
  );
}

/* ── CheckoutFlow ─────────────────────────────────── */
function CheckoutFlow() {
  usePageTitle('Checkout — ChamaoLucca');
  const { user, profile, loading: authLoading } = useAuth();
  const { items, clearCart, cartId } = useCart();
  const { isOpen, openTime, closeTime, loading: storeLoading } = useStore();
  const { step, STEP_ORDER, savedAddress, address, schedule, deliveryMode } = useCheckout();
  const navigate = useNavigate();

  const [payment,     setPayment]     = useState('pix');
  const [saving,      setSaving]      = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [error,       setError]       = useState(null);
  const [payError,    setPayError]    = useState(null); // { message, orderId, orderNumber, total }
  const [showAuth,    setShowAuth]    = useState(false);

  const orderPlaced = useRef(false);

  /* Guards — don't redirect if we just placed an order */
  useEffect(() => {
    if (items.length === 0 && !orderPlaced.current) navigate('/loja');
  }, [items, navigate]);

  const stepIdx = STEP_ORDER.indexOf(step);

  if (authLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  // If user not logged in, show login prompt (not a hard redirect)
  if (!user) {
    return (
      <>
        <div style={{
          minHeight: '60vh', display: 'flex', alignItems: 'center',
          justifyContent: 'center', padding: '24px 16px',
        }}>
          <div style={{
            background: '#fff', borderRadius: 20,
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            padding: '36px 28px', maxWidth: 380, width: '100%',
            textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            <Icon name="lock" size={40} fill style={{ color: '#16a34a' }} />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Faça login para continuar
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
              Para finalizar seu pedido, precisamos saber quem você é.
              Seus itens no carrinho estão salvos!
            </p>
            <button
              onClick={() => setShowAuth(true)}
              style={{
                padding: '13px', background: '#16a34a', color: '#fff',
                border: 'none', borderRadius: 12, fontWeight: 700,
                fontSize: '0.95rem', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Entrar ou criar conta
            </button>
            <button
              onClick={() => navigate('/loja')}
              style={{
                background: 'none', border: 'none', color: '#94a3b8',
                fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              ← Voltar para a loja
            </button>
          </div>
        </div>

        {showAuth && (
          <AuthModal onClose={() => setShowAuth(false)} />
        )}
      </>
    );
  }

  async function placeOrder({ couponCode = null, testMode = false } = {}) {
    // A2: guard contra double-submit (lag de rede + clique duplo)
    if (saving) return;

    if (!user) { setError('Você precisa estar logado para finalizar o pedido.'); return; }
    if (items.length === 0) { setError('Seu carrinho está vazio.'); return; }
    if (!storeLoading && !isOpen) {
      setError(`Loja fechada no momento. Abrimos às ${openTime} e fechamos às ${closeTime}.`);
      return;
    }
    if (!cartId) {
      setError('Carrinho ainda sincronizando. Aguarde um instante e tente novamente.');
      return;
    }

    const addrData = savedAddress?.street ? savedAddress : address;
    if (!addrData?.street?.trim()) { setError('Por favor, preencha o endereço de entrega.'); return; }
    if (deliveryMode === 'scheduled' && (!schedule?.date || !schedule?.time)) { setError('Por favor, selecione data e horário.'); return; }
    if (!payment) { setError('Por favor, selecione uma forma de pagamento.'); return; }

    setError(null);
    setSaving(true);
    setRedirecting(true);

    const delivery_data = {
      address:        addrData.street.trim(),
      complement:     addrData.complement || null,
      city:           addrData.city || '',
      neighborhood:   addrData.neighborhood || '',
      phone:          addrData.phone || '',
      zip_code:       addrData.zipCode || '',
      reference:      addrData.reference || '',
      delivery_date:  deliveryMode === 'express' ? new Date().toISOString().slice(0, 10) : schedule.date,
      delivery_time:  deliveryMode === 'express' ? 'express' : schedule.time,
      delivery_mode:  deliveryMode,
    };

    const { data: placeData, error: placeErr } = await supabase.functions.invoke('place-order', {
      body: {
        cart_id: cartId,
        coupon_code: couponCode,
        delivery_data,
        payment_method: payment,
        test_mode: testMode,
      },
    });

    if (placeErr || !placeData?.ok) {
      setSaving(false);
      setRedirecting(false);
      setError(placeData?.error || placeErr?.message || 'Erro ao criar pedido. Tente novamente.');
      return;
    }

    const order          = placeData.order;
    const total          = parseFloat(placeData.total    ?? order.total);
    const shippingApplied = parseFloat(placeData.shipping ?? order.shipping);
    const discountApplied = parseFloat(placeData.discount ?? order.discount ?? 0);
    const itemsSnapshot  = (placeData.items ?? []).map((i) => ({
      title:      i.title,
      quantity:   i.quantity,
      unit_price: i.unit_price,
    }));

    // Modo teste: aprovacao server-side (ALLOW_TEST_ORDERS no Supabase)
    if (testMode) {
      orderPlaced.current = true;
      clearCart();
      setSaving(false);
      setRedirecting(false);
      navigate(`/pedido/${order.id}?mp_status=approved`);
      return;
    }

    // 6. Limpar carrinho (pedido já salvo)
    orderPlaced.current = true;
    clearCart();
    setSaving(false);

    // 7. Redirecionar para Mercado Pago
    await openMercadoPago({ order, total, itemsSnapshot, shipping: shippingApplied, discount: discountApplied });
  }

  async function openMercadoPago({ order, total, itemsSnapshot, shipping = 4, discount = 0 }) {
    setRedirecting(true);
    try {
      const appUrl = window.location.origin;

      const { data, error: fnErr } = await supabase.functions.invoke('create-mp-preference', {
        body: {
          order_id:       order.id,
          order_number:   order.order_number,
          items:          itemsSnapshot,
          payer_email:    user.email ?? `${user.id}@chamaolucca.com.br`,
          payer_name:     profile?.name ?? 'Cliente',
          shipping:       shipping,
          discount:       discount,
          app_url:        appUrl,
          payment_method: mpPaymentMethod(payment),
        },
      });

      if (fnErr || !data?.ok) {
        throw new Error('Não conseguimos conectar ao Mercado Pago. Seu pedido foi salvo — tente novamente em instantes.');
      }

      window.location.href = data.checkout_url;

    } catch (err) {
      setRedirecting(false);
      setPayError({
        message:       err.message,
        orderId:       order.id,
        orderNumber:   order.order_number,
        total,
        shipping:      shippingApplied,
        discount:      discountApplied,
        order,
        itemsSnapshot,
      });
    }
  }


  async function handlePayRetry() {
    if (!payError) return;
    await openMercadoPago({
      order:         payError.order,
      total:         payError.total,
      itemsSnapshot: payError.itemsSnapshot,
      shipping:      payError.shipping  ?? 0,
      discount:      payError.discount  ?? 0,
    });
  }

  // ── Telas de estado ──────────────────────────────
  if (redirecting) return <RedirectingScreen />;

  if (payError) {
    return (
      <PaymentErrorScreen
        message={payError.message}
        orderId={payError.orderId}
        orderNumber={payError.orderNumber}
        onRetry={handlePayRetry}
        retrying={redirecting}
      />
    );
  }

  // ── Steps do checkout ────────────────────────────
  return (
    <div className="co-page">
      {!storeLoading && !isOpen && (
        <ClosedStoreDialog
          openTime={openTime}
          closeTime={closeTime}
          onClose={() => navigate('/loja')}
        />
      )}

      {/* Steps bar */}
      <div className="co-steps-bar">
        {STEP_META.map((s, i) => (
          <div
            key={s.key}
            style={{ display: 'flex', alignItems: 'center', flex: i < STEP_META.length - 1 ? 1 : 'none' }}
          >
            <div className={`co-step-item${i === stepIdx ? ' active' : i < stepIdx ? ' done' : ''}`}>
              <div className="co-step-circle">{i < stepIdx ? '✓' : i + 1}</div>
              <span className="co-step-label">{s.label}</span>
            </div>
            {i < STEP_META.length - 1 && (
              <div className={`co-step-line${i < stepIdx ? ' done' : ''}`} />
            )}
          </div>
        ))}
      </div>

      {/* Global error */}
      {error && (
        <div style={{
          margin: '0 auto 16px', maxWidth: 520,
          background: '#fee2e2', border: '1px solid #fca5a5',
          borderRadius: 12, padding: '12px 16px',
          color: '#b91c1c', fontSize: '0.9rem', fontWeight: 500,
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <Icon name="error" size={18} fill style={{ color: '#dc2626', flexShrink: 0, marginTop: 1 }} />
          <span style={{ flex: 1, lineHeight: 1.4 }}>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#b91c1c', flexShrink: 0 }}
            aria-label="Dispensar erro"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}

      {step === CHECKOUT_STEPS.ADDRESS      && <AddressStep onBackToStore={() => navigate('/loja')} />}
      {step === CHECKOUT_STEPS.SCHEDULE     && <ScheduleStep />}
      {step === CHECKOUT_STEPS.PAYMENT      && <PaymentStep payment={payment} setPayment={setPayment} />}
      {step === CHECKOUT_STEPS.CONFIRMATION && (
        <ReviewStep onPlaceOrder={placeOrder} saving={saving} />
      )}
    </div>
  );
}

export default function Checkout() {
  return (
    <CheckoutProvider>
      <CheckoutFlow />
    </CheckoutProvider>
  );
}
