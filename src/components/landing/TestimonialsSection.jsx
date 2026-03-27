const TESTIMONIALS = [
  {
    id: 1,
    text: 'Assustador. Pq fiz um pedido. E minutos depois lembrei que tinha esquecido e pedi mais itens. O primeiro chegou em menos de 10min e eu nem subi as escadas e já chegou o outro...',
    stars: 5,
  },
  {
    id: 2,
    text: 'Surreal!!! Pedi e em BEM menos de 20min chegou. E ainda com suprisínhas que eu amei < 3',
    stars: 5,
  },
  {
    id: 3,
    text: 'Tenho que admitir... eu não acreditava que seria bom programar as compras, eu sou esquecida, e o jeito de atendimento é uma experiência surreal. Me lembraram 1 dia antes, ligaram para informar e entregaram antes do horário definido...',
    stars: 5,
  },
];

function StarRating({ count }) {
  return (
    <div className="lp-testimonial-stars" aria-label={`${count} estrelas`}>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} aria-hidden="true">★</span>
      ))}
    </div>
  );
}

export default function TestimonialsSection() {
  return (
    <section className="lp-testimonials" aria-label="Depoimentos de clientes">
      <div className="container">
        <h2 className="lp-testimonials-title">O QUE FALAM DE NÓS</h2>
        <div className="lp-testimonials-grid">
          {TESTIMONIALS.map(({ id, text, stars }) => (
            <article key={id} className="lp-testimonial-card">
              <StarRating count={stars} />
              <blockquote className="lp-testimonial-text">"{text}"</blockquote>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
