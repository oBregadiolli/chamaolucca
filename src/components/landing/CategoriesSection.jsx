import { useRef } from 'react';
import { Link } from 'react-router-dom';

import imgVelocidade  from '../../assets/imagensNovas/Seleção da Velocidade.png';
import imgMercearia   from '../../assets/imagensNovas/Mercearia.png';
import imgPadaria     from '../../assets/imagensNovas/Padaria e Matinais.png';
import imgMolhos      from '../../assets/imagensNovas/Molho e Conservas.png';
import imgLaticinios  from '../../assets/imagensNovas/Laticínios.png';
import imgBiscoitos   from '../../assets/imagensNovas/Biscoitos e Salgadinhos.png';
import imgLimpeza     from '../../assets/imagensNovas/Limpeza.png';
import imgAcougue     from '../../assets/imagensNovas/Açougue e Peixaria.png';
import imgBebidas     from '../../assets/imagensNovas/Bebidas.png';
import imgCervejas    from '../../assets/imagensNovas/Cervejas.png';
import imgCongelados  from '../../assets/imagensNovas/Congelados.png';
import imgDestilados  from '../../assets/imagensNovas/Destilados.png';
import imgDoces       from '../../assets/imagensNovas/Doces e Sorvetes.png';
import imgFarmacia    from '../../assets/imagensNovas/Farmácia.png';
import imgHigiene     from '../../assets/imagensNovas/Higiene & Beleza.png';
import imgHortifrutti from '../../assets/imagensNovas/Hortifrúti.png';
import imgPets        from '../../assets/imagensNovas/Pets.png';
import imgPratico     from '../../assets/imagensNovas/Prático e Rápido.png';
import imgProximos    from '../../assets/imagensNovas/Próximos a Vencer.png';
import imgSaude       from '../../assets/imagensNovas/Saúde e Fit.png';
import imgUtilidades  from '../../assets/imagensNovas/Utilidades.png';
import imgVinhos      from '../../assets/imagensNovas/Vinhos e Espumantes.png';

const CATEGORIES = [
  { id: 'velocidade',  label: 'Seleção da\nVelocidade',   img: imgVelocidade  },
  { id: 'mercearia',   label: 'Mercearia',                 img: imgMercearia   },
  { id: 'padaria',     label: 'Padaria e\nMatinais',       img: imgPadaria     },
  { id: 'molhos',      label: 'Molhos e\nConservas',       img: imgMolhos      },
  { id: 'laticinios',  label: 'Laticínios',                img: imgLaticinios  },
  { id: 'biscoitos',   label: 'Biscoitos e\nSalgadinhos',  img: imgBiscoitos   },
  { id: 'limpeza',     label: 'Limpeza',                   img: imgLimpeza     },
  { id: 'acougue',     label: 'Açougue e\nPeixaria',       img: imgAcougue     },
  { id: 'bebidas',     label: 'Bebidas',                   img: imgBebidas     },
  { id: 'cervejas',    label: 'Cervejas',                  img: imgCervejas    },
  { id: 'congelados',  label: 'Congelados',                img: imgCongelados  },
  { id: 'destilados',  label: 'Destilados',                img: imgDestilados  },
  { id: 'doces',       label: 'Doces e\nSorvetes',         img: imgDoces       },
  { id: 'farmacia',    label: 'Farmácia',                  img: imgFarmacia    },
  { id: 'higiene',     label: 'Higiene &\nBeleza',         img: imgHigiene     },
  { id: 'hortifrutti', label: 'Hortifrúti',                img: imgHortifrutti },
  { id: 'pets',        label: 'Pets',                      img: imgPets        },
  { id: 'pratico',     label: 'Prático e\nRápido',         img: imgPratico     },
  { id: 'proximos',    label: 'Próximos a\nVencer',        img: imgProximos    },
  { id: 'saude',       label: 'Saúde e Fit',               img: imgSaude       },
  { id: 'utilidades',  label: 'Utilidades',                img: imgUtilidades  },
  { id: 'vinhos',      label: 'Vinhos e\nEspumantes',      img: imgVinhos      },
];

const SCROLL_AMOUNT = 320;

export default function CategoriesSection() {
  const rowRef = useRef(null);

  const scroll = (dir) => {
    if (rowRef.current) {
      rowRef.current.scrollBy({ left: dir * SCROLL_AMOUNT, behavior: 'smooth' });
    }
  };

  return (
    <section className="lp-categories" aria-label="Categorias disponíveis">
      <div className="container">
        <div className="lp-categories-card">
          <h2 className="lp-categories-title">
            TUDO ISSO! Sem sair de casa 🔥🔥🔥
          </h2>

          <div className="lp-categories-carousel">
            <button
              className="lp-cat-arrow lp-cat-arrow--left"
              onClick={() => scroll(-1)}
              aria-label="Categorias anteriores"
            >
              ‹
            </button>

            <div className="lp-categories-row" ref={rowRef}>
              {CATEGORIES.map(({ id, label, img }) => (
                <Link key={id} to="/loja" className="lp-category-item">
                  <div className="lp-category-icon" aria-hidden="true">
                    <img src={img} alt={label} className="lp-category-img" />
                  </div>
                  <span className="lp-category-label">{label}</span>
                </Link>
              ))}
            </div>

            <button
              className="lp-cat-arrow lp-cat-arrow--right"
              onClick={() => scroll(1)}
              aria-label="Próximas categorias"
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
