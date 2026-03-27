import { useStore } from '../../context/StoreContext';

const STORE_ADDRESS = 'Tv. Teodoro Neri de Carneiro - Jardim Petrolar, Alagoinhas - BA, 48005-560';
const MAPS_EMBED_URL =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3888.0!2d-38.3250!3d-12.1400!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sTv.+Teodoro+Neri+de+Carneiro%2C+Alagoinhas!5e0!3m2!1spt-BR!2sbr!4v1700000000000!5m2!1spt-BR!2sbr';

export default function HowToGetDialog({ onClose }) {
  const { openTime, closeTime } = useStore();

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{ zIndex: 500, alignItems: 'center' }}
    >
      <div
        className="htg-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Como chegar ao Lucca Mercado"
      >
        {/* Close button */}
        <button className="htg-close" onClick={onClose} aria-label="Fechar">
          x
        </button>

        {/* Title */}
        <h2 className="htg-title">Lucca Mercado</h2>

        {/* Map */}
        <div className="htg-map-wrap">
          <iframe
            title="Localização Lucca Mercado"
            src={MAPS_EMBED_URL}
            width="100%"
            height="100%"
            style={{ border: 0, display: 'block' }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        {/* Info section */}
        <div className="htg-info">
          <h3 className="htg-info-title">Localização e horário</h3>

          <div className="htg-info-row">
            <span className="htg-info-icon material-symbols-rounded">location_on</span>
            <div>
              <strong>Endereço</strong>
              <p>{STORE_ADDRESS}, Brasil</p>
            </div>
          </div>

          <div className="htg-info-row">
            <span className="htg-info-icon material-symbols-rounded">schedule</span>
            <div>
              <strong>Estamos abertos</strong>
              <p>{openTime} - {closeTime}</p>
            </div>
          </div>

          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(STORE_ADDRESS)}`}
            target="_blank"
            rel="noreferrer"
            className="htg-maps-btn"
          >
            <span className="material-symbols-rounded" style={{ fontSize: 18 }}>open_in_new</span>
            Abrir no Google Maps
          </a>
        </div>
      </div>
    </div>
  );
}
