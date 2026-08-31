import { useId } from 'react';

/* =====================================================
   ClosedStoreDialog — exibido fora do horário de func.
   ===================================================== */
export function ClosedStoreDialog({ openTime, closeTime, onClose, onTest }) {
  const titleId = useId();
  const descId = useId();

  return (
    <div className="gs-overlay" onClick={onClose}>
      <div
        className="gs-dialog"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <div className="gs-emoji-area">
          {/* Illustration placeholder — sad face */}
          <span style={{ fontSize: 64 }}>😔</span>
        </div>
        <div className="gs-body">
          <p id={titleId} className="gs-heading">
            <strong>Olá, tudo bem?</strong>{' '}
            Que pena, mas ainda não estamos abertos para poder te servir.
          </p>
          <p id={descId} className="gs-sub">
            Mas mantenha a calma, fique triste não,{' '}
            daqui a pouco vamos está entregando sua comida preferida aonde você quiser.
            {' '}Abrimos às <strong>{openTime}</strong> e fechamos às <strong>{closeTime}</strong>.
          </p>
          <button type="button" className="gs-ok-btn" onClick={onClose}>OK</button>
          {onTest && (
            <button
              type="button"
              onClick={onTest}
              style={{
                marginTop: 10,
                width: '100%',
                padding: '10px 16px',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: '#f59e0b',
                background: 'transparent',
                border: '1px dashed #f59e0b',
                borderRadius: 10,
                cursor: 'pointer',
              }}
            >
              ⚙️ Testar mesmo assim (localhost)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   OutsideAreaDialog — CEP fora da área de entrega
   ===================================================== */
export function OutsideAreaDialog({ coverageCities, onClose }) {
  const titleId = useId();
  const descId = useId();

  return (
    <div className="gs-overlay" onClick={onClose}>
      <div
        className="gs-dialog"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <div className="gs-emoji-area">
          <span style={{ fontSize: 64 }}>📍</span>
        </div>
        <div className="gs-body">
          <p id={titleId} className="gs-heading">
            <strong>Ei!</strong>{' '}
            Ficamos felizes em te ver aqui.{' '}
            Infelizmente, seu CEP ainda está{' '}
            <strong>fora</strong> da nossa área de entrega.
          </p>
          <p id={descId} className="gs-sub">
            Mas <strong>você pode retirar</strong> o pedido na loja.
            {coverageCities?.length > 0 && (
              <> Atendemos: {coverageCities.join(', ')}.</>
            )}
          </p>
          <button type="button" className="gs-ok-btn" onClick={onClose}>OK</button>
        </div>
      </div>
    </div>
  );
}
