import { useCheckout } from '../../context/CheckoutContext';
import FreeShippingBanner from './FreeShippingBanner';

function PixIcon({ active }) {
  const c = active ? '#00b4d8' : '#94a3b8';
  return (
    <svg width="28" height="28" viewBox="0 0 512 512" fill={c} aria-hidden="true">
      <path d="M242.4 36.2c7.4-7.4 19.4-7.4 26.8 0l82.8 82.8c7.4 7.4 7.4 19.4 0 26.8l-82.8 82.8c-7.4 7.4-19.4 7.4-26.8 0l-82.8-82.8c-7.4-7.4-7.4-19.4 0-26.8l82.8-82.8zm-126 126c7.4-7.4 19.4-7.4 26.8 0l82.8 82.8c7.4 7.4 7.4 19.4 0 26.8l-82.8 82.8c-7.4 7.4-19.4 7.4-26.8 0L33.2 292.4c-7.4-7.4-7.4-19.4 0-26.8l82.8-82.8h.4zm252 0l82.8 82.8c7.4 7.4 7.4 19.4 0 26.8L369.4 354c-7.4 7.4-19.4 7.4-26.8 0l-82.8-82.8c-7.4-7.4-7.4-19.4 0-26.8l82.8-82.8c7.4-7.4 19.4-7.4 26.8 0h.6zm-126 126c7.4-7.4 19.4-7.4 26.8 0l82.8 82.8c7.4 7.4 7.4 19.4 0 26.8l-82.8 82.8c-7.4 7.4-19.4 7.4-26.8 0l-82.8-82.8c-7.4-7.4-7.4-19.4 0-26.8l82.8-82.8z" />
    </svg>
  );
}

function CardIcon({ active, color }) {
  const c = active ? color : '#94a3b8';
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
      stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

const PAYMENT_OPTIONS = [
  {
    id: 'pix',
    label: 'Pix',
    desc: 'Aprovação instantânea',
    Icon: ({ active }) => <PixIcon active={active} />,
    accent: '#00b4d8',
    activeBg: '#f0fdff',
    activeBorder: '#7dd3fc',
    tag: 'Recomendado',
    tagColor: '#0284c7',
    tagBg: '#e0f2fe',
  },
  {
    id: 'credit_card',
    label: 'Crédito',
    desc: 'Todas as bandeiras',
    Icon: ({ active }) => <CardIcon active={active} color="#6366f1" />,
    accent: '#6366f1',
    activeBg: '#eef2ff',
    activeBorder: '#a5b4fc',
    tag: null,
  },
  {
    id: 'debit_card',
    label: 'Débito',
    desc: 'À vista',
    Icon: ({ active }) => <CardIcon active={active} color="#0ea5e9" />,
    accent: '#0ea5e9',
    activeBg: '#f0f9ff',
    activeBorder: '#7dd3fc',
    tag: null,
  },
];

export default function PaymentStep({ payment, setPayment }) {
  const { nextStep, prevStep } = useCheckout();

  return (
    <div className="co-step-wrapper">
      <FreeShippingBanner />
      <div className="co-card" style={{ padding: '24px 20px' }}>

        {/* Header */}
        <div className="co-card-header" style={{ marginBottom: 6 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
            <line x1="1" y1="10" x2="23" y2="10" />
          </svg>
          <h1 className="co-card-title">Meio de pagamento</h1>
        </div>

        <p style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: 20, lineHeight: 1.5 }}>
          Você será redirecionado para o <strong style={{ color: '#374151' }}>Mercado Pago</strong> para finalizar o pagamento.
        </p>

        {/* Payment options — row layout */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
          {PAYMENT_OPTIONS.map((opt) => {
            const isActive = payment === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPayment(opt.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 16px',
                  border: `2px solid ${isActive ? opt.activeBorder : '#e5e7eb'}`,
                  borderRadius: 14,
                  background: isActive ? opt.activeBg : '#fafafa',
                  cursor: 'pointer',
                  transition: 'all 160ms ease',
                  boxShadow: isActive ? `0 0 0 3px ${opt.accent}18` : 'none',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  width: '100%',
                }}
              >
                {/* Icon circle */}
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: isActive ? '#fff' : '#f3f4f6',
                  border: `1.5px solid ${isActive ? opt.activeBorder : '#e5e7eb'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 160ms',
                }}>
                  <opt.Icon active={isActive} />
                </div>

                {/* Text */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      color: isActive ? opt.accent : '#374151',
                    }}>
                      {opt.label}
                    </span>
                    {opt.tag && isActive && (
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 700,
                        background: opt.tagBg, color: opt.tagColor,
                        borderRadius: 99, padding: '2px 8px',
                      }}>
                        {opt.tag}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>
                    {opt.desc}
                  </div>
                </div>

                {/* Radio indicator */}
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  border: `2px solid ${isActive ? opt.accent : '#d1d5db'}`,
                  background: isActive ? opt.accent : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 160ms',
                }}>
                  {isActive && (
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* MP security badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: 10,
          marginBottom: 12,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: 600 }}>
            Pagamento 100% seguro via Mercado Pago
          </span>
        </div>

        {/* Terms */}
        <p style={{
          fontSize: '0.75rem', color: '#94a3b8',
          textAlign: 'center', lineHeight: 1.5,
          marginBottom: 4,
        }}>
          Confirmando, você concorda com os{' '}
          <button type="button" className="co-payment-terms-link" style={{ fontSize: '0.75rem' }}
            onClick={(e) => e.preventDefault()}>
            Termos de uso
          </button>.
        </p>

        {/* Actions */}
        <div className="co-actions">
          <button
            className="co-back-btn co-back-btn--dark"
            onClick={prevStep}
            type="button"
            aria-label="Voltar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          <button
            className="co-advance-btn"
            onClick={nextStep}
            disabled={!payment}
            type="button"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '1.1rem' }}>arrow_forward</span>
            Continuar
          </button>
        </div>

      </div>
    </div>
  );
}
