export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
}

const ALL_TIMES = [
  { value: '08:00-10:00', label: '08:00 — 10:00', endHour: 10 },
  { value: '10:00-12:00', label: '10:00 — 12:00', endHour: 12 },
  { value: '12:00-14:00', label: '12:00 — 14:00', endHour: 14 },
  { value: '14:00-16:00', label: '14:00 — 16:00', endHour: 16 },
  { value: '16:00-18:00', label: '16:00 — 18:00', endHour: 18 },
  { value: '18:00-20:00', label: '18:00 — 20:00', endHour: 20 },
];

export function getDeliveryDates() {
  const dates = [];
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Inclui hoje se ainda há horários disponíveis (antes das 20h)
  const nowHour = today.getHours() + today.getMinutes() / 60;
  const hasTimesToday = ALL_TIMES.some((t) => t.endHour > nowHour + 1);
  if (hasTimesToday) {
    dates.push({ value: todayStr, label: 'Hoje', isToday: true });
  }

  for (let i = 1; i <= 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    dates.push({
      value: d.toISOString().split('T')[0],
      label: d.toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
      }),
      isToday: false,
    });
  }
  return dates;
}

export function getDeliveryTimes() {
  return ALL_TIMES.map(({ value, label }) => ({ value, label }));
}

/** Retorna apenas os horários válidos para a data selecionada.
 *  Se for hoje, filtra os slots cujo fim já passou (+ 1h de margem). */
export function getDeliveryTimesForDate(dateValue) {
  const todayStr = new Date().toISOString().split('T')[0];
  if (dateValue !== todayStr) return ALL_TIMES.map(({ value, label }) => ({ value, label }));

  const now = new Date();
  const nowHour = now.getHours() + now.getMinutes() / 60;
  // Só mostra slots cujo horário de FIM é pelo menos 1h a partir de agora
  return ALL_TIMES
    .filter((t) => t.endHour > nowHour + 1)
    .map(({ value, label }) => ({ value, label }));
}

export function generateOrderNumber() {
  return Math.floor(1000 + Math.random() * 9000);
}
