/* =====================================================
   ClosedStoreDialog — exibido fora do horário de func.
   ===================================================== */
export function ClosedStoreDialog({ openTime, closeTime, onClose }) {
  return (
    <div className="gs-overlay" onClick={onClose}>
      <div className="gs-dialog" onClick={(e) => e.stopPropagation()} role="alertdialog">
        <div className="gs-emoji-area">
          {/* Illustration placeholder — sad face */}
          <span style={{ fontSize: 64 }}>😔</span>
        </div>
        <div className="gs-body">
          <p className="gs-heading">
            <strong>Olá, tudo bem?</strong>{' '}
            Que pena, mas ainda não estamos abertos para poder te servir.
          </p>
          <p className="gs-sub">
            Mas mantenha a calma, fique triste não,{' '}
            daqui a pouco vamos está entregando sua comida preferida aonde você quiser.
          </p>
          <p className="gs-hours">
            Abrimos às <strong>{openTime}</strong> e fechamos às <strong>{closeTime}</strong>.
          </p>
          <button className="gs-ok-btn" onClick={onClose}>OK</button>
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   OutsideAreaDialog — CEP fora da área de entrega
   ===================================================== */
export function OutsideAreaDialog({ coverageCities, onClose }) {
  return (
    <div className="gs-overlay" onClick={onClose}>
      <div className="gs-dialog" onClick={(e) => e.stopPropagation()} role="alertdialog">
        <div className="gs-emoji-area">
          <span style={{ fontSize: 64 }}>📍</span>
        </div>
        <div className="gs-body">
          <p className="gs-heading">
            <strong>Ei!</strong>{' '}
            Ficamos felizes em te ver aqui.{' '}
            Infelizmente, seu CEP ainda está{' '}
            <strong>fora</strong> da nossa área de entrega.
          </p>
          <p className="gs-sub">
            Mas <strong>você pode retirar</strong> o pedido na loja.
          </p>
          {coverageCities?.length > 0 && (
            <p style={{ fontSize: '0.8125rem', color: '#9ca3af', marginTop: 12 }}>
              Atendemos: {coverageCities.join(', ')}
            </p>
          )}
          <button className="gs-ok-btn" onClick={onClose}>OK</button>
        </div>
      </div>
    </div>
  );
}
