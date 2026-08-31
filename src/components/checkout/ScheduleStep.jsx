import { useState, useEffect } from 'react';
import { useCheckout } from '../../context/CheckoutContext';
import { getDeliveryDates } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import FreeShippingBanner from './FreeShippingBanner';
import '../../styles/schedule-step.css';

/* ── Bairros elegíveis para entrega rápida ── */
const EXPRESS_TOKEN = 'petrolar';

function normalizeText(value) {
  return (value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')     // pontuacao/simbolos -> espaco
    .trim()
    .replace(/\s+/g, ' ');           // colapsa espacos repetidos
}

/** Distancia de Levenshtein: nb minimo de edicoes (inserir/remover/trocar
 *  letra) para transformar uma palavra na outra. 0 = identicas. */
function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

function isExpressEligible(neighborhood) {
  const normalized = normalizeText(neighborhood);
  if (!normalized) return false;
  return normalized.split(' ').some((token) => {
    if (token.length < 6) return false;             // "petrolar" tem 8; evita casar palavra curta a toa
    if (token.includes(EXPRESS_TOKEN)) return true; // caminho rapido: contem "petrolar"
    return levenshtein(token, EXPRESS_TOKEN) <= 2;  // tolera ate 2 erros de digitacao
  });
}

export default function ScheduleStep() {
  const {
    schedule, setSchedule,
    deliveryMode, setDeliveryMode,
    address,
    nextStep, prevStep,
  } = useCheckout();

  // ── Slot availability (fetched per selected date) ──
  const [slots,        setSlots]        = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError,   setSlotsError]   = useState(false);

  const expressAvailable = isExpressEligible(address.neighborhood);
  const DELIVERY_DATES   = getDeliveryDates();

  const selDate = schedule?.date || '';
  const selTime = schedule?.time || '';
  const slotsActive = deliveryMode === 'scheduled' && Boolean(selDate);
  const visibleSlots = slotsActive ? slots : [];

  useEffect(() => {
    if (!slotsActive) return;

    let cancelled = false;

    (async () => {
      setLoadingSlots(true);
      setSlotsError(false);
      const { data, error } = await supabase.rpc('get_slot_availability', { p_date: selDate });
      if (cancelled) return;
      setLoadingSlots(false);
      if (error) {
        setSlotsError(true);
        return;
      }

      const todayStr = new Date().toISOString().split('T')[0];
      let result = data || [];
      if (selDate === todayStr) {
        const nowHour = new Date().getHours() + new Date().getMinutes() / 60;
        result = result.filter((s) => {
          const endH = parseInt(s.slot_end.split(':')[0], 10);
          return endH > nowHour + 1;
        });
      }
      setSlots(result);
    })();

    return () => {
      cancelled = true;
    };
  }, [selDate, deliveryMode, slotsActive]);

  function handleDate(value) {
    const slotValue = (s) => `${s.slot_start}-${s.slot_end}`;
    const prevOk   = visibleSlots.some((s) => slotValue(s) === selTime && !s.is_full);
    setSchedule((prev) => ({ ...(prev || {}), date: value, time: prevOk ? selTime : '' }));
  }

  function handleTime(slotValue, isFull) {
    if (isFull) return;
    setSchedule((prev) => ({ ...(prev || {}), time: slotValue }));
  }

  function selectMode(mode) {
    if (mode === 'express' && !expressAvailable) return;
    setDeliveryMode(mode);
    if (mode === 'express') {
      const today = DELIVERY_DATES[0];
      if (today) setSchedule({ date: today.value, time: 'express' });
    }
  }

  // canAdvance: for scheduled mode, selected time must exist and not be full
  const selectedSlot = visibleSlots.find((s) => `${s.slot_start}-${s.slot_end}` === selTime);
  const canAdvance =
    deliveryMode === 'express'
      ? expressAvailable
      : selDate && selTime && selectedSlot && !selectedSlot?.is_full;

  // Available / full / all counts
  const available = visibleSlots.filter((s) => !s.is_full);
  const allFull   = visibleSlots.length > 0 && available.length === 0;

  // Resumo da escolha (quando dá pra avançar) / dica do que falta (quando não dá)
  const dateLabel = DELIVERY_DATES.find((d) => d.value === selDate)?.label || '';
  let choiceSummary = '';
  let advanceHint   = '';
  if (deliveryMode === 'express') {
    if (expressAvailable) choiceSummary = 'Entrega Rápida · hoje · até 10 min';
    else advanceHint = 'Entrega rápida indisponível no seu bairro';
  } else if (!selDate) {
    advanceHint = 'Escolha um dia para entrega';
  } else if (!selTime) {
    advanceHint = 'Escolha um horário disponível';
  } else if (selectedSlot?.is_full) {
    advanceHint = 'Esse horário lotou — escolha outro';
  } else if (selectedSlot) {
    choiceSummary = `Programada · ${dateLabel} · ${selectedSlot.slot_label}`;
  }

  return (
    <div className="co-step-wrapper">
      <FreeShippingBanner />
      <div className="co-card">
        <div className="co-card-header">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#22c55e"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <h1 className="co-card-title">Quando entregamos?</h1>
        </div>

        {/* ── Delivery Mode ── */}
        <p className="co-section-label">Tipo de entrega</p>
        <div className="dm-grid">

          {/* Programada */}
          <button
            type="button"
            className="dm-card"
            data-selected={deliveryMode === 'scheduled'}
            aria-pressed={deliveryMode === 'scheduled'}
            onClick={() => selectMode('scheduled')}
          >
            <span className="material-symbols-rounded dm-card-icon" aria-hidden="true">calendar_month</span>
            <span className="dm-card-title">Programada</span>
            <span className="dm-card-sub">Escolha dia e horário</span>
          </button>

          {/* Rápida */}
          <button
            type="button"
            className="dm-card dm-card--express"
            data-selected={deliveryMode === 'express'}
            data-unavailable={!expressAvailable}
            aria-pressed={deliveryMode === 'express'}
            disabled={!expressAvailable}
            onClick={() => selectMode('express')}
          >
            <span className="material-symbols-rounded dm-card-icon" aria-hidden="true">bolt</span>
            <span className="dm-card-title">Rápida</span>
            {expressAvailable ? (
              <span className="dm-card-sub">Até 10 min!</span>
            ) : (
              <span className="dm-card-sub dm-card-sub--reason">Só no Jardim Petrolar</span>
            )}
          </button>
        </div>

        {/* ── Agendamento ── */}
        {deliveryMode === 'scheduled' && (
          <>
            <p className="co-section-label">Escolha o dia</p>
            <div className="date-grid" style={{ marginBottom: 24 }}>
              {DELIVERY_DATES.map((d) => {
                const dt = new Date(d.value + 'T00:00:00');
                return (
                  <button key={d.value}
                    className={`date-opt${selDate === d.value ? ' selected' : ''}`}
                    onClick={() => handleDate(d.value)}
                    type="button"
                  >
                    <div className="date-opt-day">
                      {d.isToday ? 'hoje' : dt.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                    </div>
                    <div className="date-opt-num">{dt.getDate()}</div>
                  </button>
                );
              })}
            </div>

            {/* Horários */}
            {selDate && (
              <>
                <p className="co-section-label">
                  Escolha o horário
                  {selDate && !loadingSlots && visibleSlots.length > 0 && (
                    allFull ? (
                      <span className="slot-count slot-count--full">
                        <span className="material-symbols-rounded slot-count-icon" aria-hidden="true">warning</span>
                        Todos lotados
                      </span>
                    ) : (
                      <span className="slot-count">
                        {available.length} disponível{available.length !== 1 ? 'is' : ''}
                      </span>
                    )
                  )}
                </p>

                {loadingSlots ? (
                  <div className="slot-msg slot-msg--loading">
                    <span className="material-symbols-rounded slot-msg-icon spin" aria-hidden="true">progress_activity</span>
                    Verificando horários disponíveis...
                  </div>
                ) : slotsError ? (
                  <div className="slot-msg slot-msg--error">
                    Erro ao carregar horários. Tente recarregar a página.
                  </div>
                ) : visibleSlots.length === 0 ? (
                  <div className="slot-msg slot-msg--empty">
                    <span className="material-symbols-rounded slot-msg-icon" aria-hidden="true">schedule</span>
                    Nenhum horário disponível para este dia. Escolha outra data ou entre em contato.
                  </div>
                ) : allFull ? (
                  <div className="slot-msg slot-msg--full">
                    <span className="material-symbols-rounded slot-msg-icon" aria-hidden="true">event_busy</span>
                    <div>
                      <div className="slot-msg-title">Todos os horários deste dia estão lotados.</div>
                      <div className="slot-msg-sub">Escolha outra data para continuar.</div>
                    </div>
                  </div>
                ) : null}

                {/* Time grid — show all slots, mark full ones */}
                {!loadingSlots && visibleSlots.length > 0 && (
                  <div className="time-grid" style={{ marginBottom: 8 }}>
                    {visibleSlots.map((slot) => {
                      const slotValue = `${slot.slot_start}-${slot.slot_end}`;
                      const isSelected = selTime === slotValue;
                      const isFull     = slot.is_full;
                      const pct        = slot.max_orders
                        ? Math.min(100, Math.round((slot.orders_count / slot.max_orders) * 100))
                        : null;

                      return (
                        <button
                          key={slot.id}
                          type="button"
                          className="slot-btn"
                          data-selected={isSelected}
                          data-full={isFull}
                          aria-pressed={isSelected}
                          onClick={() => handleTime(slotValue, isFull)}
                          disabled={isFull}
                          title={isFull && slot.max_orders
                            ? `Lotado (${slot.orders_count}/${slot.max_orders} pedidos)`
                            : slot.slot_label}
                        >
                          <span>{slot.slot_label}</span>

                          {isFull ? (
                            <span className="slot-btn-status slot-btn-status--full">Lotado</span>
                          ) : pct !== null && pct >= 70 ? (
                            <span className="slot-btn-status slot-btn-status--last">Últimas vagas</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Legend for full slots */}
                {!loadingSlots && visibleSlots.some((s) => s.is_full) && !allFull && (
                  <div className="slot-legend">
                    <span className="slot-legend-swatch" />
                    Horários em vermelho estão lotados e não podem ser selecionados.
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ── Express confirmation ── */}
        {deliveryMode === 'express' && expressAvailable && (
          <div className="express-confirm">
            <span className="material-symbols-rounded express-confirm-icon" aria-hidden="true">electric_bolt</span>
            <div>
              <div className="express-confirm-title">Entrega em até 10 minutos!</div>
              <div className="express-confirm-sub">
                Seu pedido será preparado e entregue imediatamente no <strong>Jardim Petrolar</strong>.
              </div>
            </div>
          </div>
        )}

        {/* ── Resumo da escolha / dica do que falta ── */}
        {choiceSummary ? (
          <p className="co-choice-summary">
            <span className="material-symbols-rounded co-summary-icon" aria-hidden="true">check_circle</span>
            {choiceSummary}
          </p>
        ) : advanceHint ? (
          <p className="co-advance-hint">
            <span className="material-symbols-rounded co-hint-icon" aria-hidden="true">info</span>
            {advanceHint}
          </p>
        ) : null}

        <div className="co-actions">
          <button className="co-back-btn" onClick={prevStep} type="button" aria-label="Voltar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          <button
            className="co-advance-btn"
            onClick={nextStep}
            disabled={!canAdvance}
            type="button"
          >
            Avançar
          </button>
        </div>
      </div>
    </div>
  );
}
