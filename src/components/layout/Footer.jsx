import bemvindoLogo from '../../assets/imagensNovas/BEMVINDO.png';

export default function Footer() {
  return (
    <footer className="lp-footer">
      <div className="lp-footer-inner container">

        {/* Esquerda — Logo + tagline */}
        <div className="lp-footer-brand">
          <img
            src={bemvindoLogo}
            alt="Lucca Mercado"
            className="lp-footer-logo-img"
          />
          <p className="lp-footer-tagline">Bem vindo ao Lucca Mercado</p>
        </div>

        {/* Direita — Instagram (topo) + Assinatura Lucca (base) */}
        <div className="lp-footer-right">
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="lp-footer-insta"
            aria-label="Instagram do ChamaoLucca"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20" aria-hidden="true">
              <rect x="2" y="2" width="20" height="20" rx="5"/>
              <circle cx="12" cy="12" r="4"/>
              <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/>
            </svg>
          </a>

          <p className="lp-footer-sig-text">Lucca</p>
        </div>

      </div>
    </footer>
  );
}
