import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import Icon from '../../components/ui/Icon';

/* ── Helpers ── */
function toInputDate(d) {
  // Returns YYYY-MM-DD from a Date object in local time
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDateBR(isoDate) {
  if (!isoDate) return '';
  const [y, m, day] = isoDate.split('-');
  return `${day}/${m}/${y}`;
}

function formatWeekday(isoDate) {
  if (!isoDate) return '';
  const dt = new Date(isoDate + 'T12:00:00');
  return dt.toLocaleDateString('pt-BR', { weekday: 'long' });
}

/* ── Per-slot row ── */
function SlotExceptionRow({ slot, date, onChange }) {
  const capacityRef = useRef({});

  // Effective values shown to user
  const effectiveActive  = slot.active_override  ?? slot.global_active;
  const effectiveMax     = slot.max_orders_override ?? slot.global_max_orders;

  // Toggle active_override
  async function toggleActive() {
    const newVal = !effectiveActive;
    // If override equals global, remove exception for this field
    const newOverride = newVal === slot.global_active ? null : newVal;
    await upsertException({ active_override: newOverride });
    onChange();
  }

  // Debounced max_orders save
  function handleCapacityChange(e) {
    const raw = e.target.value;
    const val = raw === '' ? null : Math.max(1, parseInt(raw, 10) || 1);
    clearTimeout(capacityRef.current.timer);
    capacityRef.current.timer = setTimeout(async () => {
      await upsertException({ max_orders_override: val });
      onChange();
    }, 800);
  }

  async function upsertException(fields) {
    if (slot.exception_id) {
      await supabase
        .from('delivery_slot_exceptions')
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq('id', slot.exception_id);
    } else {
      await supabase
        .from('delivery_slot_exceptions')
        .insert({ slot_id: slot.slot_id, date, ...fields });
    }
  }

  async function clearException() {
    if (!slot.exception_id) return;
    await supabase.from('delivery_slot_exceptions').delete().eq('id', slot.exception_id);
    onChange();
  }

  const isOverridden = slot.has_exception &&
    (slot.active_override !== null || slot.max_orders_override !== null);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 130px 52px 36px',
      alignItems: 'center',
      gap: 10,
      padding: '11px 14px',
      border: `1.5px solid ${!effectiveActive ? '#fca5a5' : isOverridden ? '#fde68a' : '#e5e7eb'}`,
      borderRadius: 12,
      background: !effectiveActive ? '#fef2f2' : isOverridden ? '#fffbeb' : '#fff',
      transition: 'all 0.2s',
    }}>
      {/* Label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="material-symbols-rounded" style={{
          fontSize: 16, flexShrink: 0,
          color: !effectiveActive ? '#ef4444' : isOverridden ? '#d97706' : '#16a34a',
        }}>schedule</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', color: !effectiveActive ? '#9ca3af' : '#111' }}>
            {slot.slot_label}
          </div>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: !effectiveActive ? '#ef4444' : isOverridden ? '#d97706' : '#6b7280' }}>
            {!effectiveActive
              ? 'Bloqueado nesta data'
              : isOverridden
                ? 'Exceção ativa'
                : 'Regra global'}
          </div>
        </div>
      </div>

      {/* Capacity override */}
      <input
        type="number"
        min="1"
        max="999"
        defaultValue={slot.max_orders_override ?? ''}
        placeholder={slot.global_max_orders ? String(slot.global_max_orders) : '∞'}
        onChange={handleCapacityChange}
        style={{
          width: '100%', padding: '7px 10px',
          border: '1.5px solid #e5e7eb', borderRadius: 8,
          fontSize: '0.875rem', fontWeight: 600, color: '#111',
          textAlign: 'center', outline: 'none', fontFamily: 'inherit',
          background: '#fafafa',
        }}
        title="Sobrescrever capacidade máxima para esta data. Deixe vazio para usar a regra global."
      />

      {/* Active toggle */}
      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
        <span className="admin-toggle-switch">
          <input
            type="checkbox"
            checked={effectiveActive}
            onChange={toggleActive}
          />
          <span className="admin-toggle-thumb" />
        </span>
      </label>

      {/* Clear override */}
      {isOverridden ? (
        <button
          type="button"
          onClick={clearException}
          title="Remover exceção — restaurar regra global"
          style={{
            width: 30, height: 30, borderRadius: 8, border: 'none',
            background: '#fef2f2', color: '#ef4444', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 0, transition: 'background 0.15s',
          }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: 15 }}>restart_alt</span>
        </button>
      ) : (
        <div style={{ width: 30 }} />
      )}
    </div>
  );
}

/* ── Main page ── */
export default function AdminDeliveryExceptions() {
  const today = toInputDate(new Date());
  const [date, setDate]       = useState(today);
  const [slots, setSlots]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast,   setToast]   = useState(null);
  const [pendingBlockAll, setPendingBlockAll] = useState(false);
  const [blockingDay,    setBlockingDay]      = useState(false);
  const [clearingDay,    setClearingDay]      = useState(false);

  const fetchSlots = useCallback(async (d) => {
    if (!d) return;
    setLoading(true);
    const { data, error } = await supabase.rpc('get_slot_exceptions_for_date', { p_date: d });
    setLoading(false);
    if (error) { setToast({ type: 'error', msg: 'Erro ao carregar agenda.' }); return; }
    setSlots(data || []);
  }, []);

  useEffect(() => { fetchSlots(date); }, [date, fetchSlots]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // Quick action: block entire day
  async function blockAllDay() {
    setBlockingDay(true);
    setPendingBlockAll(false);
    let errors = 0;
    for (const slot of slots) {
      const { error } = slot.exception_id
        ? await supabase.from('delivery_slot_exceptions')
            .update({ active_override: false, updated_at: new Date().toISOString() })
            .eq('id', slot.exception_id)
        : await supabase.from('delivery_slot_exceptions')
            .insert({ slot_id: slot.slot_id, date, active_override: false });
      if (error) errors++;
    }
    await fetchSlots(date);
    setBlockingDay(false);
    setToast(errors > 0
      ? { type: 'error', msg: `${errors} horário(s) não puderam ser bloqueados.` }
      : { type: 'success', msg: `Todos os horários de ${formatDateBR(date)} bloqueados.` }
    );
  }

  // Quick action: clear all exceptions for day
  async function clearAllDay() {
    const ids = slots.filter((s) => s.exception_id).map((s) => s.exception_id);
    if (ids.length === 0) return;
    setClearingDay(true);
    const { error } = await supabase.from('delivery_slot_exceptions').delete().in('id', ids);
    await fetchSlots(date);
    setClearingDay(false);
    setToast(error
      ? { type: 'error', msg: 'Erro ao limpar exceções.' }
      : { type: 'success', msg: `Exceções de ${formatDateBR(date)} removidas.` }
    );
  }

  const hasAnyException = slots.some((s) => s.has_exception);
  const allBlocked      = slots.length > 0 && slots.every((s) => s.active_override === false);

  // Stats for header cards
  const statTotal    = slots.length;
  const statBlocked  = slots.filter((s) => s.active_override === false).length;
  const statOverride = slots.filter((s) => s.has_exception && s.active_override !== false).length;

  // Day navigation
  function shiftDate(days) {
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() + days);
    const shifted = toInputDate(d);
    if (shifted >= today) setDate(shifted);
  }

  return (
    <div className="admin-page">
      {toast && (
        <div className={`admin-toast admin-toast--${toast.type}`}>
          <Icon name={toast.type === 'success' ? 'check_circle' : 'error_outline'} size={16} />
          {toast.msg}
        </div>
      )}

      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Agenda de Exceções</h1>
          <p className="admin-page-subtitle">
            Controle bloqueios e capacidades por data específica.
          </p>
        </div>
      </div>

      {/* ── Date picker card (redesigned) ── */}
      <div className="admin-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Prev day */}
          <button
            type="button"
            onClick={() => shiftDate(-1)}
            disabled={date <= today}
            title="Dia anterior"
            style={{
              width: 36, height: 36, display: 'flex', alignItems: 'center',
              justifyContent: 'center', borderRadius: 8, border: '1.5px solid #e5e7eb',
              background: '#fff', cursor: date <= today ? 'not-allowed' : 'pointer',
              opacity: date <= today ? 0.4 : 1, flexShrink: 0,
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 18, color: '#374151' }}>chevron_left</span>
          </button>

          {/* Date input */}
          <div style={{ flex: '1 1 180px' }}>
            <label style={{
              display: 'block', fontSize: '0.7rem', fontWeight: 700,
              color: '#94a3b8', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              Data da Exceção
            </label>
            <input
              type="date"
              value={date}
              min={today}
              onChange={(e) => setDate(e.target.value)}
              className="admin-input"
              style={{ maxWidth: 200 }}
            />
          </div>

          {/* Next day */}
          <button
            type="button"
            onClick={() => shiftDate(1)}
            title="Próximo dia"
            style={{
              width: 36, height: 36, display: 'flex', alignItems: 'center',
              justifyContent: 'center', borderRadius: 8, border: '1.5px solid #e5e7eb',
              background: '#fff', cursor: 'pointer', flexShrink: 0,
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 18, color: '#374151' }}>chevron_right</span>
          </button>

          {/* Date chip */}
          {date && (
            <div style={{
              marginLeft: 'auto', padding: '10px 18px',
              background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
              border: '1px solid #bbf7d0', borderRadius: 12,
              fontSize: '0.9rem', color: '#15803d', fontWeight: 700,
              display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
            }}>
              <span style={{ fontSize: '0.68rem', color: '#6b7280', fontWeight: 400, marginBottom: 1 }}>Data selecionada</span>
              {formatDateBR(date)} · {formatWeekday(date)}
            </div>
          )}
        </div>

        {/* Stats row */}
        {!loading && slots.length > 0 && (
          <div style={{
            display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap',
            paddingTop: 14, borderTop: '1px solid #f1f5f9',
          }}>
            {[
              { label: 'Total de horários', value: statTotal, color: '#374151', bg: '#f8fafc', border: '#e2e8f0', icon: 'schedule' },
              { label: 'Bloqueados', value: statBlocked, color: statBlocked > 0 ? '#dc2626' : '#94a3b8', bg: statBlocked > 0 ? '#fef2f2' : '#f8fafc', border: statBlocked > 0 ? '#fca5a5' : '#e2e8f0', icon: 'block' },
              { label: 'Com exceção ativa', value: statOverride, color: statOverride > 0 ? '#d97706' : '#94a3b8', bg: statOverride > 0 ? '#fffbeb' : '#f8fafc', border: statOverride > 0 ? '#fde68a' : '#e2e8f0', icon: 'edit_calendar' },
            ].map((s) => (
              <div key={s.label} style={{
                flex: '1 1 100px', padding: '10px 14px', borderRadius: 10,
                background: s.bg, border: `1.5px solid ${s.border}`,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span className="material-symbols-rounded" style={{ fontSize: 18, color: s.color }}>{s.icon}</span>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 500, marginTop: 2 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Slots card ── */}
      {date && (
        <div className="admin-card">
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#111', margin: 0 }}>
                Horários — {formatDateBR(date)}
              </h2>
              {allBlocked && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: '0.7rem', fontWeight: 700, color: '#dc2626',
                  background: '#fef2f2', border: '1px solid #fca5a5',
                  borderRadius: 99, padding: '2px 10px',
                }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 12 }}>block</span>
                  Dia inteiro bloqueado
                </span>
              )}
              {hasAnyException && !allBlocked && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: '0.7rem', fontWeight: 700, color: '#d97706',
                  background: '#fffbeb', border: '1px solid #fde68a',
                  borderRadius: 99, padding: '2px 10px',
                }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 12 }}>warning</span>
                  Exceções ativas neste dia
                </span>
              )}
            </div>

            {/* Quick actions */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {!allBlocked && (
                <button
                  type="button"
                  onClick={() => setPendingBlockAll(true)}
                  disabled={blockingDay}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: 8, border: '1.5px solid #fca5a5',
                    background: '#fef2f2', color: '#dc2626', fontWeight: 600,
                    fontSize: '0.8rem', cursor: blockingDay ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit', opacity: blockingDay ? 0.6 : 1,
                  }}
                >
                  <span
                    className="material-symbols-rounded"
                    style={{ fontSize: 15, animation: blockingDay ? 'spin 1s linear infinite' : 'none' }}
                  >
                    {blockingDay ? 'progress_activity' : 'event_busy'}
                  </span>
                  {blockingDay ? 'Bloqueando...' : 'Bloquear dia inteiro'}
                </button>
              )}
              {hasAnyException && (
                <button
                  type="button"
                  onClick={clearAllDay}
                  disabled={clearingDay}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: 8, border: '1.5px solid #e5e7eb',
                    background: '#f9fafb', color: '#374151', fontWeight: 600,
                    fontSize: '0.8rem', cursor: clearingDay ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit', opacity: clearingDay ? 0.6 : 1,
                  }}
                >
                  <span
                    className="material-symbols-rounded"
                    style={{ fontSize: 15, animation: clearingDay ? 'spin 1s linear infinite' : 'none' }}
                  >
                    {clearingDay ? 'progress_activity' : 'restart_alt'}
                  </span>
                  {clearingDay ? 'Limpando...' : 'Limpar todas as exceções'}
                </button>
              )}
            </div>
          </div>

          {/* Column labels */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 130px 52px 36px',
            gap: 10, paddingBottom: 8, marginBottom: 4,
            borderBottom: '1px solid #f3f4f6',
            fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8',
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            <span>Horário / Status</span>
            <span style={{ textAlign: 'center' }}>Máx. pedidos</span>
            <span style={{ textAlign: 'center' }}>Ativo</span>
            <span />
          </div>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 0', color: '#94a3b8', fontSize: '0.85rem' }}>
              <span className="material-symbols-rounded" style={{ fontSize: 18, animation: 'spin 1s linear infinite' }}>
                progress_activity
              </span>
              Carregando agenda...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {slots.map((slot) => (
                <SlotExceptionRow
                  key={slot.slot_id}
                  slot={slot}
                  date={date}
                  onChange={() => fetchSlots(date)}
                />
              ))}
            </div>
          )}

          {/* Legend */}
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: '0.75rem', color: '#94a3b8' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 3 }} />
                Regra global ativa
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 3 }} />
                Exceção ativa para este dia
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 3 }} />
                Bloqueado nesta data
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: '#94a3b8' }}>
              <Icon name="restart_alt" size={13} />
              O ícone <strong style={{ color: '#374151' }}>↺</strong> restaura a regra global para aquele horário.
            </div>
          </div>
        </div>
      )}

      {pendingBlockAll && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setPendingBlockAll(false)}
        >
          <div
            style={{
              background: '#fff', borderRadius: 14, padding: '24px 28px',
              maxWidth: 380, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span className="material-symbols-rounded" style={{ fontSize: 24, color: '#dc2626' }}>event_busy</span>
              <span style={{ fontWeight: 700, fontSize: '1rem', color: '#111' }}>Bloquear dia inteiro?</span>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0 20px', lineHeight: 1.5 }}>
              Todos os horários de <strong>{formatDateBR(date)}</strong> serão bloqueados.
              Clientes não poderão agendar entregas neste dia.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setPendingBlockAll(false)}
                style={{
                  padding: '9px 18px', borderRadius: 8, border: '1.5px solid #e5e7eb',
                  background: '#f9fafb', color: '#374151', fontWeight: 600,
                  fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={blockAllDay}
                style={{
                  padding: '9px 18px', borderRadius: 8, border: 'none',
                  background: '#dc2626', color: '#fff', fontWeight: 600,
                  fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Sim, bloquear tudo
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
