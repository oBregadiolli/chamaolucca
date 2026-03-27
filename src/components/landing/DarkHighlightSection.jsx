// Mockup de celular com tela do app
function PhoneMockup() {
  return (
    <div className="lp-dark-phone" aria-hidden="true">
      {/* Frame do celular */}
      <div className="phone-frame">
        {/* Notch */}
        <div className="phone-notch" />
        {/* Tela */}
        <div className="phone-screen">
          {/* Header do app */}
          <div className="app-screen-header">
            <div className="app-screen-logo">
              {/* Mascote pequeno */}
              <svg viewBox="0 0 40 44" fill="none" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
                <ellipse cx="20" cy="28" rx="16" ry="14" fill="#F5A263" stroke="#111" strokeWidth="3"/>
                <ellipse cx="25" cy="23" rx="5" ry="5" fill="white" opacity="0.85"/>
                <path d="M14 11 C11 6 8 4 9 2 C12 5 16 8 16 12Z" fill="#22c55e" stroke="#111" strokeWidth="2"/>
                <path d="M20 13 Q21 9 22 6" stroke="#111" strokeWidth="2" strokeLinecap="round" fill="none"/>
                <path d="M22 6 C25 3 29 2 31 5 C28 5 25 7 24 10" fill="#22c55e" stroke="#111" strokeWidth="2"/>
              </svg>
              <span className="app-brand">FALA, HUMANO!</span>
            </div>
          </div>
          {/* Conteúdo do app */}
          <div className="app-screen-body">
            {[
              { label: 'COMPRAR AGORA', sub: 'entrega em até 15min' },
              { label: 'PROGRAMAR ENTREGA', sub: 'escolha dia e hora' },
              { label: 'MINHA LISTA', sub: 'seus favoritos salvos' },
            ].map((item) => (
              <div key={item.label} className="app-screen-item">
                <div className="app-screen-item-dot" />
                <div>
                  <div className="app-screen-item-label">{item.label}</div>
                  <div className="app-screen-item-sub">{item.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DarkHighlightSection() {
  return (
    <section className="lp-dark" aria-label="Economize em poucos cliques">
      <div className="lp-dark-inner container">
        {/* Esquerda */}
        <div className="lp-dark-text">
          <p className="lp-dark-eyebrow">
            <span className="lp-dark-arrow">→</span> NADA DE FILAS E NEM TRÂNSITO.
          </p>
          <h2 className="lp-dark-headline">
            Economize em<br />poucos cliques
          </h2>
          <p className="lp-dark-body">
            Produtos com qualidade do sempre chegando pra você no dia que desejar
            ou em até <strong>15MINUTOS</strong>.
          </p>
        </div>

        {/* Direita — mockup */}
        <div className="lp-dark-visual">
          <PhoneMockup />
        </div>
      </div>
    </section>
  );
}
