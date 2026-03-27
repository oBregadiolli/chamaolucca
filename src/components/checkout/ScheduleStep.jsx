import { useState, useEffect, useCallback } from 'react';
import { useCheckout } from '../../context/CheckoutContext';
import { getDeliveryDates } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

/* ── Bairros elegíveis para entrega rápida ── */
const EXPRESS_NEIGHBORHOODS = ['jardim petrolar'];

function isExpressEligible(neighborhood) {
  if (!neighborhood) return false;
  return EXPRESS_NEIGHBORHOODS.some((n) =>
    neighborhood.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().includes(n)
  );
}

export default function ScheduleStep() {
  const {
    schedule, setSchedule,
    deliveryMode, setDeliveryMode,
    address,
    nextStep, prevStep,
  } = useCheckout();

  const [showExpressInfo, setShowExpressInfo] = useState(false);

  // ── Slot availability (fetched per selected date) ──
  const [slots,        setSlots]        = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError,   setSlotsError]   = useState(false);

  const expressAvailable = isExpressEligible(address.neighborhood);
  const DELIVERY_DATES   = getDeliveryDates();

  const selDate = schedule?.date || '';
  const selTime = schedule?.time || '';

  // Fetch slots from RPC whenever selected date changes
  const fetchSlots = useCallback(async (dateValue) => {
    if (!dateValue) { setSlots([]); return; }
    setLoadingSlots(true);
    setSlotsError(false);
    const { data, error } = await supabase
      .rpc('get_slot_availability', { p_date: dateValue });
    setLoadingSlots(false);
    if (error) { setSlotsError(true); return; }

    // If today, additionally filter slots whose end hour has already passed
    const todayStr = new Date().toISOString().split('T')[0];
    let result = data || [];
    if (dateValue === todayStr) {
      const nowHour = new Date().getHours() + new Date().getMinutes() / 60;
      result = result.filter((s) => {
        const endH = parseInt(s.slot_end.split(':')[0], 10);
        return endH > nowHour + 1;
      });
    }
    setSlots(result);
  }, []);

  useEffect(() => {
    if (deliveryMode === 'scheduled') fetchSlots(selDate);
  }, [selDate, deliveryMode, fetchSlots]);

  function handleDate(value) {
    const slotValue = (s) => `${s.slot_start}-${s.slot_end}`;
    const prevOk   = slots.some((s) => slotValue(s) === selTime && !s.is_full);
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
  const selectedSlot = slots.find((s) => `${s.slot_start}-${s.slot_end}` === selTime);
  const canAdvance =
    deliveryMode === 'express'
      ? expressAvailable
      : selDate && selTime && selectedSlot && !selectedSlot?.is_full;

  // Available / full / all counts
  const available = slots.filter((s) => !s.is_full);
  const allFull   = slots.length > 0 && available.length === 0;

  return (
    <div className="co-step-wrapper">
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 22 }}>

          {/* Programada */}
          <button
            type="button"
            onClick={() => selectMode('scheduled')}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 6, padding: '14px 10px',
              border: deliveryMode === 'scheduled' ? '2px solid #16a34a' : '1.5px solid #e2e8f0',
              borderRadius: 14,
              background: deliveryMode === 'scheduled' ? '#f0fdf4' : '#fff',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <span className="material-symbols-rounded"
              style={{ fontSize: 24, color: deliveryMode === 'scheduled' ? '#16a34a' : '#94a3b8' }}>
              calendar_month
            </span>
            <span style={{ fontSize: '0.82rem', fontWeight: 700,
              color: deliveryMode === 'scheduled' ? '#15803d' : '#64748b' }}>
              Programada
            </span>
            <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>Escolha dia e horário</span>
          </button>

          {/* Rápida */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => selectMode('express')}
              disabled={!expressAvailable}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: 6, padding: '14px 10px',
                width: '100%', height: '100%',
                border: deliveryMode === 'express'
                  ? '2px solid #16a34a'
                  : expressAvailable ? '1.5px solid #e2e8f0' : '1.5px solid #f1f5f9',
                borderRadius: 14,
                background: deliveryMode === 'express' ? '#f0fdf4' : expressAvailable ? '#fff' : '#fafafa',
                cursor: expressAvailable ? 'pointer' : 'not-allowed',
                opacity: expressAvailable ? 1 : 0.55,
                transition: 'all 0.2s',
              }}
            >
              <span className="material-symbols-rounded" style={{
                fontSize: 24,
                color: deliveryMode === 'express' ? '#16a34a' : expressAvailable ? '#f59e0b' : '#d1d5db',
              }}>bolt</span>
              <span style={{ fontSize: '0.82rem', fontWeight: 700,
                color: deliveryMode === 'express' ? '#15803d' : expressAvailable ? '#64748b' : '#cbd5e1' }}>
                Rápida ⚡
              </span>
              <span style={{ fontSize: '0.72rem', color: expressAvailable ? '#9ca3af' : '#d1d5db' }}>
                {expressAvailable ? 'Até 10 min!' : 'Indisponível no bairro'}
              </span>
            </button>

            {/* Info button */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowExpressInfo(!showExpressInfo); }}
              aria-label="Informações sobre entrega rápida"
              style={{
                position: 'absolute', top: 8, right: 8,
                width: 22, height: 22, borderRadius: '50%', border: 'none',
                background: showExpressInfo ? '#16a34a' : '#e2e8f0',
                color: showExpressInfo ? '#fff' : '#64748b',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 0, transition: 'all 0.2s',
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: 15 }}>info</span>
            </button>

            {showExpressInfo && (
              <div style={{
                position: 'absolute', top: 34, right: 0, zIndex: 50,
                background: '#fff', border: '1.5px solid #e2e8f0',
                borderRadius: 10, padding: '10px 14px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
                fontSize: '0.8rem', color: '#374151', lineHeight: 1.5, maxWidth: 220,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, marginBottom: 4, color: '#f59e0b' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 16 }}>bolt</span>
                  Entrega Rápida
                </div>
                Entrega realizada em <strong>até 10 minutos</strong> para o bairro <strong>Jardim Petrolar</strong>.
              </div>
            )}
          </div>
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
                  {selDate && !loadingSlots && slots.length > 0 && (
                    <span style={{
                      marginLeft: 8, fontSize: '0.72rem', fontWeight: 600,
                      color: allFull ? '#dc2626' : '#94a3b8',
                    }}>
                      {allFull ? '⚠ Todos lotados' : `${available.length} disponível${available.length !== 1 ? 'is' : ''}`}
                    </span>
                  )}
                </p>

                {loadingSlots ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 0', color: '#94a3b8', fontSize: '0.85rem' }}>
                    <span className="material-symbols-rounded" style={{ fontSize: 18, animation: 'spin 1s linear infinite' }}>progress_activity</span>
                    Verificando horários disponíveis...
                  </div>
                ) : slotsError ? (
                  <div style={{
                    padding: '12px 14px', background: '#fef2f2', border: '1px solid #fca5a5',
                    borderRadius: 10, fontSize: '0.85rem', color: '#b91c1c', marginBottom: 12,
                  }}>
                    Erro ao carregar horários. Tente recarregar a página.
                  </div>
                ) : slots.length === 0 ? (
                  <div style={{
                    padding: '14px 16px', background: '#fef2f2', border: '1px solid #fca5a5',
                    borderRadius: 12, fontSize: '0.85rem', color: '#b91c1c', marginBottom: 12,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <span className="material-symbols-rounded" style={{ fontSize: 18 }}>schedule</span>
                    Nenhum horário disponível para este dia. Escolha outra data ou entre em contato.
                  </div>
                ) : allFull ? (
                  <div style={{
                    padding: '14px 16px', background: '#fff7ed', border: '1px solid #fed7aa',
                    borderRadius: 12, fontSize: '0.85rem', color: '#c2410c', marginBottom: 12,
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                  }}>
                    <span className="material-symbols-rounded" style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>event_busy</span>
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: 3 }}>Todos os horários deste dia estão lotados.</div>
                      <div style={{ fontSize: '0.78rem', color: '#9a3412' }}>Escolha outra data para continuar.</div>
                    </div>
                  </div>
                ) : null}

                {/* Time grid — show all slots, mark full ones */}
                {!loadingSlots && slots.length > 0 && (
                  <div className="time-grid" style={{ marginBottom: 8 }}>
                    {slots.map((slot) => {
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
                          onClick={() => handleTime(slotValue, isFull)}
                          disabled={isFull}
                          style={{
                            padding: '11px 6px 10px',
                            border: isSelected
                              ? '2px solid #16a34a'
                              : isFull ? '1.5px solid #fca5a5' : '2px solid #e5e7eb',
                            borderRadius: 10,
                            textAlign: 'center',
                            background: isSelected
                              ? '#f0fdf4'
                              : isFull ? '#fef2f2' : '#fff',
                            cursor: isFull ? 'not-allowed' : 'pointer',
                            fontSize: '0.8125rem',
                            fontWeight: 500,
                            color: isSelected ? '#16a34a' : isFull ? '#b91c1c' : '#374151',
                            transition: 'all 0.15s',
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 3,
                          }}
                          title={isFull && slot.max_orders
                            ? `Lotado (${slot.orders_count}/${slot.max_orders} pedidos)`
                            : slot.slot_label}
                        >
                          {/* Slot label */}
                          <span style={{ fontWeight: isSelected ? 700 : 500 }}>
                            {slot.slot_label}
                          </span>

                          {/* Status sub-label */}
                          {isFull ? (
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#ef4444' }}>
                              Lotado
                            </span>
                          ) : pct !== null && pct >= 70 ? (
                            <span style={{ fontSize: '0.65rem', color: '#f59e0b', fontWeight: 700 }}>
                              {100 - pct}% livre
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Legend for full slots */}
                {!loadingSlots && slots.some((s) => s.is_full) && !allFull && (
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ display: 'inline-block', width: 10, height: 10, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 3 }} />
                    Horários em vermelho estão lotados e não podem ser selecionados.
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ── Express confirmation ── */}
        {deliveryMode === 'express' && expressAvailable && (
          <div style={{
            padding: '14px 16px',
            background: 'linear-gradient(135deg, #fef3c7 0%, #fff7ed 100%)',
            border: '1.5px solid #fde68a', borderRadius: 12, marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span className="material-symbols-rounded" style={{ fontSize: 28, color: '#f59e0b' }}>electric_bolt</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#92400e' }}>Entrega em até 10 minutos!</div>
              <div style={{ fontSize: '0.78rem', color: '#a16207', marginTop: 2 }}>
                Seu pedido será preparado e entregue imediatamente no <strong>Jardim Petrolar</strong>.
              </div>
            </div>
          </div>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

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
