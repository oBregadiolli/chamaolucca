import logobylucca from '../../assets/logobylucca.png';

export default function Footer() {
  return (
    <footer className="lp-footer">
      <div className="lp-footer-inner container">
        {/* Logo */}
        <div className="lp-footer-brand">
          <div className="lp-footer-logo-row">
            <img
              src={logobylucca}
              alt="ChamaoLucca"
              style={{ height: 40, width: 'auto', display: 'block' }}
            />
          </div>
          <p className="lp-footer-tagline">Bem vindo ao Lucca Mercado</p>
        </div>

        {/* Instagram */}
        <div className="lp-footer-social">
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="lp-footer-insta"
            aria-label="Instagram do ChamaoLucca"
          >
            {/* Instagram icon */}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22" aria-hidden="true">
              <rect x="2" y="2" width="20" height="20" rx="5"/>
              <circle cx="12" cy="12" r="4"/>
              <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/>
            </svg>
          </a>
        </div>

        {/* Assinatura Lucca */}
        <div className="lp-footer-signature">
          <img
            src={logobylucca}
            alt="Lucca"
            style={{ height: 28, width: 'auto', display: 'block', opacity: 0.6 }}
          />
        </div>
      </div>
    </footer>
  );
}
