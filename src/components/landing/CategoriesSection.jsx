import Icon from '../ui/Icon';

const CATEGORIES = [
  {
    id: 'velocidade',
    label: 'Seleção da\nVelocidade',
    icon: 'bolt',
    bg: '#FFF3CD',
  },
  {
    id: 'mercearia',
    label: 'Mercearia',
    icon: 'storefront',
    bg: '#D1FAE5',
  },
  {
    id: 'padaria',
    label: 'Padaria e\nMatinais',
    icon: 'bakery_dining',
    bg: '#FEE2E2',
  },
  {
    id: 'molhos',
    label: 'Molhos e\nConservas',
    icon: 'set_meal',
    bg: '#E0E7FF',
  },
  {
    id: 'laticinios',
    label: 'Laticínios',
    icon: 'water_drop',
    bg: '#F0FDF4',
  },
  {
    id: 'biscoitos',
    label: 'Biscoitos e\nSalgadinhos',
    icon: 'cookie',
    bg: '#FEF9C3',
  },
  {
    id: 'limpeza',
    label: 'Limpeza',
    icon: 'cleaning_services',
    bg: '#F0F9FF',
  },
];

export default function CategoriesSection() {
  return (
    <section className="lp-categories" aria-label="Categorias disponíveis">
      <div className="container">
        <div className="lp-categories-card">
          <h2 className="lp-categories-title">
            TUDO ISSO! Sem sair de casa 🔥🔥🔥
          </h2>
          <div className="lp-categories-row">
            {CATEGORIES.map(({ id, label, icon, bg }) => (
              <div key={id} className="lp-category-item">
                <div
                  className="lp-category-icon"
                  style={{ background: bg }}
                  aria-hidden="true"
                >
                  <Icon name={icon} size={32} fill />
                </div>
                <span className="lp-category-label">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
