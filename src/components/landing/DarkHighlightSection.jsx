import celularImg from '../../assets/celular-lp.png';

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

        {/* Direita — imagem do celular */}
        <div className="lp-dark-visual">
          <img
            src={celularImg}
            alt="App ChamaoLucca no celular"
            className="lp-dark-phone-img"
          />
        </div>
      </div>
    </section>
  );
}
