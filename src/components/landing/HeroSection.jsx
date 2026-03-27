import { Link } from 'react-router-dom';

// Mascote SVG do Lucca — laranjinha estilo cartoon com folhas
function LuccaMascot() {
  return (
    <svg
      viewBox="0 0 400 420"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="hero-mascot-svg"
      aria-hidden="true"
    >
      {/* Corpo principal – laranjinha grande */}
      <ellipse cx="200" cy="270" rx="160" ry="145" fill="#F5A263" stroke="#111" strokeWidth="8" />

      {/* Brilho/reflex */}
      <ellipse cx="248" cy="230" rx="28" ry="28" fill="white" opacity="0.85" />

      {/* Folha esquerda */}
      <path
        d="M155 110 C120 60 80 40 90 20 C120 55 160 80 165 120Z"
        fill="#22c55e"
        stroke="#111"
        strokeWidth="6"
        strokeLinejoin="round"
      />

      {/* Talo central */}
      <path
        d="M200 130 Q205 90 220 60"
        stroke="#111"
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
      />

      {/* Cacho / folha direita curvada */}
      <path
        d="M220 60 C250 30 290 20 310 50 C280 55 250 70 240 100"
        fill="#22c55e"
        stroke="#111"
        strokeWidth="6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function HeroSection({ onOpenAuth }) {
  return (
    <section className="lp-hero" aria-label="Apresentação do serviço">
      <div className="lp-hero-inner container">
        {/* Coluna esquerda — texto + CTA */}
        <div className="lp-hero-text">
          <h1 className="lp-hero-headline">
            Pensou em mercado?<br />
            Chama o Lucca ッ
          </h1>
          <p className="lp-hero-subtitle">
            Seu supermercado online: Nada de filas, nem trânsito ou de sair do conforto
            da sua casa. <strong>Compre antes mesmo da água ferver!</strong>
          </p>
          <Link to="/loja" className="lp-hero-cta">
            FAÇA TEU MERCADO AQUI
          </Link>
        </div>

        {/* Coluna direita — mascote */}
        <div className="lp-hero-visual" aria-hidden="true">
          <LuccaMascot />
        </div>
      </div>
    </section>
  );
}
