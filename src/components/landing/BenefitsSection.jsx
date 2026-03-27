// Ícone 1 — mão fazendo snap / estalo (Monte em segundos)
function IconSnap() {
  return (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="benefit-icon-svg" aria-hidden="true">
      {/* Traços de movimento */}
      <line x1="100" y1="18" x2="112" y2="10" stroke="#111" strokeWidth="5" strokeLinecap="round"/>
      <line x1="108" y1="32" x2="118" y2="28" stroke="#111" strokeWidth="5" strokeLinecap="round"/>
      <line x1="90" y1="14" x2="94" y2="4" stroke="#111" strokeWidth="5" strokeLinecap="round"/>
      {/* Palma da mão */}
      <path d="M30 80 C25 65 32 42 48 38 C58 35 68 42 68 55 L68 48 C68 40 76 38 80 44 L80 52 C82 46 90 46 92 52 L92 62 C94 56 100 56 102 62 L100 82 C100 94 90 105 76 105 L56 105 C44 105 32 96 30 80Z"
        fill="#22c55e" stroke="#111" strokeWidth="6" strokeLinejoin="round"/>
      {/* Dedo médio dobrado sobre polegar */}
      <path d="M48 38 L48 28 C48 22 56 22 58 28 L58 55" stroke="#22c55e" strokeWidth="14" strokeLinecap="round"/>
      <path d="M48 38 L48 28 C48 22 56 22 58 28 L58 55" stroke="#111" strokeWidth="6" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

// Ícone 2 — sacola de compras com produtos (Seleção de Qualidade)
function IconQuality() {
  return (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="benefit-icon-svg" aria-hidden="true">
      {/* Garrafa */}
      <rect x="28" y="38" width="22" height="60" rx="5" fill="white" stroke="#111" strokeWidth="5"/>
      <rect x="32" y="28" width="14" height="14" rx="3" fill="white" stroke="#111" strokeWidth="5"/>
      <rect x="28" y="46" width="22" height="14" rx="0" fill="#22c55e" stroke="#111" strokeWidth="0"/>
      {/* Caixa */}
      <rect x="58" y="52" width="36" height="46" rx="4" fill="#F5A263" stroke="#111" strokeWidth="5"/>
      <line x1="76" y1="52" x2="76" y2="98" stroke="#111" strokeWidth="3"/>
      {/* Fruta pequena */}
      <circle cx="76" cy="36" r="14" fill="#F5A263" stroke="#111" strokeWidth="5"/>
      <path d="M76 22 C76 15 82 10 82 10" stroke="#22c55e" strokeWidth="5" strokeLinecap="round"/>
      <path d="M76 22 C70 14 64 12 64 12" stroke="#22c55e" strokeWidth="5" strokeLinecap="round"/>
    </svg>
  );
}

// Ícone 3 — tag de preço com símbolo ッ (Preços Justos)
function IconPrice() {
  return (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="benefit-icon-svg" aria-hidden="true">
      {/* Traços de movimento */}
      <line x1="18" y1="22" x2="8" y2="14" stroke="#111" strokeWidth="5" strokeLinecap="round"/>
      <line x1="14" y1="36" x2="4" y2="32" stroke="#111" strokeWidth="5" strokeLinecap="round"/>
      <line x1="26" y1="14" x2="22" y2="4" stroke="#111" strokeWidth="5" strokeLinecap="round"/>
      {/* Coração/tag verde */}
      <path d="M60 105 L18 63 C10 55 10 42 18 34 C26 26 38 26 46 34 L60 48 L74 34 C82 26 94 26 102 34 C110 42 110 55 102 63 Z"
        fill="#22c55e" stroke="#111" strokeWidth="6" strokeLinejoin="round"/>
      {/* Tag dentro */}
      <rect x="48" y="56" width="24" height="24" rx="4" fill="white" stroke="#111" strokeWidth="4" transform="rotate(-45 60 68)"/>
      <circle cx="60" cy="52" r="3" fill="#111"/>
      {/* Texto ッ */}
      <text x="60" y="76" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#111">ッ</text>
    </svg>
  );
}

const BENEFITS = [
  {
    id: 'snap',
    Icon: IconSnap,
    title: 'MONTE EM\nSEGUNDOS',
    text: 'Você define se quer programada ou piscou, chegou.',
  },
  {
    id: 'quality',
    Icon: IconQuality,
    title: 'SELEÇÃO DE\nQUALIDADE',
    text: 'As marcas que você ama, nossa garantia que você encontre tudo o que ama.',
  },
  {
    id: 'price',
    Icon: IconPrice,
    title: 'PREÇOS\nJUSTOS',
    text: 'Os mesmos preços do supermercados do bairro, só que bem mais prático.',
  },
];

export default function BenefitsSection() {
  return (
    <section className="lp-benefits" aria-label="Benefícios">
      <div className="container">
        <p className="lp-benefits-eyebrow">TUDO O QUE VOCÊ PRECISA.</p>
        <h2 className="lp-benefits-headline">
          Nada de filas. Já montou sua lista bb?<br />
          Agora relaxe... ッ Piscou?{' '}
          <span className="lp-benefits-chegou">CHEGOU.</span>
        </h2>

        <div className="lp-benefits-grid">
          {BENEFITS.map(({ id, Icon, title, text }) => (
            <div key={id} className="lp-benefit-item">
              <div className="lp-benefit-icon">
                <Icon />
              </div>
              <h3 className="lp-benefit-title">{title}</h3>
              <p className="lp-benefit-text">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
