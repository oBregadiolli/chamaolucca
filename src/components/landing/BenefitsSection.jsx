import pp1 from '../../assets/imagensNovas/PP1.png';
import pp2 from '../../assets/imagensNovas/PP2.png';
import pp3 from '../../assets/imagensNovas/PP3.png';

const BENEFITS = [
  {
    id: 'snap',
    img: pp1,
    title: 'MONTE EM\nSEGUNDOS',
    text: 'Você define se quer programada ou piscou, chegou.',
  },
  {
    id: 'quality',
    img: pp2,
    title: 'SELEÇÃO DE\nQUALIDADE',
    text: 'As marcas que você ama, nossa garantia que você encontre tudo o que ama.',
  },
  {
    id: 'price',
    img: pp3,
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
          {BENEFITS.map(({ id, img, title, text }) => (
            <div key={id} className="lp-benefit-item">
              <div className="lp-benefit-icon">
                <img src={img} alt={title.replace(/\n/g, ' ')} className="benefit-icon-img" />
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
