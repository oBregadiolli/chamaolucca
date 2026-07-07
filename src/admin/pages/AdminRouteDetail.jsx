import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from '../../components/ui/Icon';
import { assignDriverToRoute, fetchAllDrivers } from '../services/adminDrivers';
import {
  cancelRoute,
  fetchRouteById,
  tryCompleteRoute,
  updateRouteStatus,
  updateStopStatus,
} from '../services/adminRoutes';

// ─── Config ───────────────────────────────────────────────────────────
const ROUTE_STATUS = {
  draft:     { label: 'Rascunho',  color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', icon: 'edit_note'    },
  active:    { label: 'Ativa',     color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', icon: 'two_wheeler'  },
  completed: { label: 'Concluída', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', icon: 'check_circle' },
  cancelled: { label: 'Cancelada', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: 'cancel'       },
};

const STOP_STATUS = {
  pending:   { label: 'Pendente',   color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', icon: 'radio_button_unchecked' },
  in_route:  { label: 'A caminho',  color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', icon: 'two_wheeler'           },
  delivered: { label: 'Entregue',   color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', icon: 'check_circle'          },
  issue:     { label: 'Problema',   color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: 'error'                 },
};

// ─── Helpers ──────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
  });
}

function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Badge ────────────────────────────────────────────────────────────
function Badge({ cfg, size = 'sm' }) {
  const pad = size === 'sm' ? '2px 10px' : '4px 14px';
  const fs  = size === 'sm' ? '0.72rem' : '0.8rem';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: pad, borderRadius: 999, fontSize: fs, fontWeight: 700,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      whiteSpace: 'nowrap',
    }}>
      <Icon name={cfg.icon} size={12} fill style={{ color: cfg.color }} />
      {cfg.label}
    </span>
  );
}

// ─── Stop status selector ─────────────────────────────────────────────
function StopStatusMenu({ currentStatus, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const cfg = STOP_STATUS[currentStatus] ?? STOP_STATUS.pending;

  return (
    <div style={{ position: 'relative' }}>
      <button
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '4px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700,
          background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          whiteSpace: 'nowrap',
        }}
      >
        <Icon name={cfg.icon} size={12} fill style={{ color: cfg.color }} />
        {cfg.label}
        <Icon name="arrow_drop_down" size={14} style={{ color: cfg.color }} />
      </button>
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 100 }}
          />
          <div style={{
            position: 'absolute', top: '100%', left: 0, marginTop: 4,
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 101,
            minWidth: 160, overflow: 'hidden',
          }}>
            {Object.entries(STOP_STATUS).map(([key, s]) => (
              <button
                key={key}
                onClick={() => { onChange(key); setOpen(false); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '9px 14px', border: 'none', cursor: 'pointer',
                  background: key === currentStatus ? s.bg : '#fff',
                  fontSize: '0.82rem', fontWeight: key === currentStatus ? 700 : 500,
                  color: key === currentStatus ? s.color : '#374151',
                  textAlign: 'left',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <Icon name={s.icon} size={14} fill style={{ color: s.color, flexShrink: 0 }} />
                {s.label}
                {key === currentStatus && (
                  <Icon name="check" size={13} style={{ color: s.color, marginLeft: 'auto' }} />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────
export default function AdminRouteDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [route,     setRoute]     = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [copied,    setCopied]    = useState(false);
  const [updatingStop, setUpdatingStop] = useState(null);
  const [toast,     setToast]     = useState(null);

  // Driver selector state
  const [drivers,       setDrivers]       = useState([]);
  const [driverOpen,    setDriverOpen]    = useState(false);
  const [savingDriver,  setSavingDriver]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, driverList] = await Promise.all([
        fetchRouteById(id),
        fetchAllDrivers({ activeOnly: true }),
      ]);
      setRoute(data);
      setDrivers(driverList);
    } catch (e) {
      console.error(e);
      showToast('Erro ao carregar rota.', 'error');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleCopy() {
    if (!route?.maps_url) return;
    await navigator.clipboard.writeText(route.maps_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function handleStopStatusChange(stop, newStatus) {
    setUpdatingStop(stop.id);
    try {
      await updateStopStatus(stop.id, newStatus, stop.order_id);
      // Optimistic update
      setRoute(r => ({
        ...r,
        route_stops: r.route_stops.map(s =>
          s.id === stop.id ? { ...s, stop_status: newStatus } : s,
        ),
      }));
      // Try auto-complete route
      if (newStatus === 'delivered') {
        const updated = await tryCompleteRoute(id);
        if (updated) {
          setRoute(r => ({ ...r, status: 'completed' }));
          showToast('🎉 Todas as paradas concluídas — rota marcada como concluída!');
        } else {
          showToast('Parada marcada como entregue.');
        }
      }
    } catch (e) {
      showToast('Erro ao atualizar parada.', 'error');
    } finally {
      setUpdatingStop(null);
    }
  }

  async function handleCancelRoute() {
    try {
      await cancelRoute(id);
      setRoute(r => ({ ...r, status: 'cancelled' }));
      showToast('Rota cancelada. Pedidos não entregues revertidos para "Preparando".');
    } catch {
      showToast('Erro ao cancelar rota.', 'error');
    }
  }

  async function handleRouteStatusChange(newStatus) {
    try {
      await updateRouteStatus(id, newStatus);
      setRoute(r => ({ ...r, status: newStatus }));
      showToast(`Rota marcada como ${ROUTE_STATUS[newStatus]?.label}.`);
    } catch {
      showToast('Erro ao atualizar status da rota.', 'error');
    }
  }

  async function handleAssignDriver(driver) {
    setSavingDriver(true);
    setDriverOpen(false);
    try {
      const updated = await assignDriverToRoute(id, driver);
      setRoute(r => ({ ...r, driver_id: updated.driver_id, driver_name: updated.driver_name, driver_phone: updated.driver_phone }));
      showToast(driver ? `Entregador "${driver.name}" atribuído.` : 'Entregador removido.');
    } catch {
      showToast('Erro ao atribuir entregador.', 'error');
    } finally {
      setSavingDriver(false);
    }
  }

  // ─── Derived stats ─────────────────────────────────────────────────
  const stops     = route?.route_stops ?? [];
  const delivered = stops.filter(s => s.stop_status === 'delivered').length;
  const inRoute   = stops.filter(s => s.stop_status === 'in_route').length;
  const issues    = stops.filter(s => s.stop_status === 'issue').length;
  const pending   = stops.filter(s => s.stop_status === 'pending').length;
  const totalStops = stops.length;
  const progress  = totalStops > 0 ? Math.round((delivered / totalStops) * 100) : 0;

  const routeCfg = route ? (ROUTE_STATUS[route.status] ?? ROUTE_STATUS.draft) : null;
  const meta     = route?.route_metadata;

  // ─── Render ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="admin-page">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#6b7280', padding: 24 }}>
          <Icon name="progress_activity" size={22} style={{ animation: 'admin-spin 0.8s linear infinite' }} />
          Carregando rota…
        </div>
      </div>
    );
  }

  if (!route) {
    return (
      <div className="admin-page">
        <div className="admin-no-results">
          <Icon name="route" size={40} className="admin-no-results-icon" />
          <p className="admin-no-results-title">Rota não encontrada</p>
          <button className="admin-btn admin-btn--ghost" onClick={() => navigate('/admin/rotas')}>
            ← Voltar para rotas
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          padding: '12px 18px', borderRadius: 10, fontSize: '0.88rem', fontWeight: 600,
          background: toast.type === 'error' ? '#fef2f2' : '#f0fdf4',
          color:      toast.type === 'error' ? '#dc2626' : '#059669',
          border:     `1px solid ${toast.type === 'error' ? '#fecaca' : '#a7f3d0'}`,
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          display: 'flex', alignItems: 'center', gap: 8,
          animation: 'fadeSlideUp 0.2s ease',
        }}>
          <Icon name={toast.type === 'error' ? 'error' : 'check_circle'} size={16} fill
            style={{ color: toast.type === 'error' ? '#dc2626' : '#059669' }} />
          {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div className="admin-page-header" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <button
            className="admin-btn admin-btn--ghost"
            onClick={() => navigate('/admin/rotas')}
            style={{ marginBottom: 10, fontSize: '0.82rem', padding: '4px 10px' }}
          >
            <Icon name="arrow_back" size={15} /> Rotas
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 className="admin-page-title" style={{ margin: 0 }}>
              <Icon name="route" size={22} style={{ verticalAlign: 'middle', marginRight: 6, color: routeCfg?.color }} />
              {route.name}
            </h1>
            <Badge cfg={routeCfg} size="md" />
            {route.is_optimized && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700,
                background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0',
              }}>
                <Icon name="auto_awesome" size={12} fill style={{ color: '#059669' }} />
                Otimizada
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 4 }}>
            <Icon name="calendar_today" size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            {fmtDate(route.delivery_date)}
            {route.profiles?.name && ` · Criada por ${route.profiles.name}`}
            {' · '}{fmtDateTime(route.created_at)}
          </p>
        </div>

        {/* Route status actions */}
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {route.status === 'active' && (
            <>
              <button
                className="admin-btn admin-btn--ghost"
                style={{ fontSize: '0.8rem', borderColor: '#dc2626', color: '#dc2626' }}
                onClick={() => handleCancelRoute()}
              >
                <Icon name="cancel" size={15} /> Cancelar rota
              </button>
              <button
                className="admin-btn admin-btn--primary"
                style={{ background: '#059669', borderColor: '#059669', fontSize: '0.85rem' }}
                onClick={() => handleRouteStatusChange('completed')}
              >
                <Icon name="check_circle" size={16} fill /> Concluir rota
              </button>
            </>
          )}
          {route.status === 'completed' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#059669', fontWeight: 600, fontSize: '0.85rem' }}>
              <Icon name="check_circle" size={18} fill style={{ color: '#059669' }} />
              Rota concluída
            </div>
          )}
          <button className="admin-btn admin-btn--ghost" onClick={load} title="Atualizar">
            <Icon name="refresh" size={16} />
          </button>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 12, marginBottom: 20,
      }}>
        {[
          { label: 'Paradas',    value: totalStops, icon: 'place',         color: '#7c3aed' },
          { label: 'Entregues',  value: delivered,  icon: 'check_circle',  color: '#059669' },
          { label: 'A caminho',  value: inRoute,    icon: 'two_wheeler',   color: '#7c3aed' },
          { label: 'Pendentes',  value: pending,    icon: 'schedule',      color: '#64748b' },
          ...(issues > 0 ? [{ label: 'Problemas', value: issues, icon: 'error', color: '#dc2626' }] : []),
          ...(meta?.total_distance ? [{ label: 'Distância', value: meta.total_distance, icon: 'straighten',  color: '#0284c7', text: true }] : []),
          ...(meta?.total_duration ? [{ label: 'Tempo est.', value: meta.total_duration, icon: 'timer',       color: '#d97706', text: true }] : []),
        ].map((card, i) => (
          <div key={i} style={{
            background: '#fff', border: '1px solid #f1f5f9',
            borderRadius: 12, padding: '14px 16px',
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name={card.icon} size={16} fill style={{ color: card.color }} />
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {card.label}
              </span>
            </div>
            <div style={{ fontWeight: 800, fontSize: card.text ? '1rem' : '1.5rem', color: card.color, lineHeight: 1 }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Progress bar ── */}
      {totalStops > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4, color: '#475569', fontWeight: 600 }}>
            <span>Progresso</span>
            <span>{delivered}/{totalStops} entregues · {progress}%</span>
          </div>
          <div style={{ height: 8, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${progress}%`,
              background: progress === 100 ? '#059669' : '#7c3aed',
              borderRadius: 99, transition: 'width 0.4s ease',
            }} />
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>

        {/* ── Stops list ── */}
        <div>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="format_list_numbered" size={18} style={{ color: '#7c3aed' }} />
            Sequência de paradas
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {stops.map((stop, idx) => {
              const o      = stop.orders;
              const sCfg   = STOP_STATUS[stop.stop_status] ?? STOP_STATUS.pending;
              const isUpdating = updatingStop === stop.id;
              const addr   = [o?.delivery_address, o?.delivery_complement, o?.neighborhood].filter(Boolean).join(', ');
              const isDone = stop.stop_status === 'delivered';

              return (
                <div key={stop.id} style={{
                  background: '#fff',
                  border: `1px solid ${isDone ? '#a7f3d0' : sCfg.border}`,
                  borderLeft: `4px solid ${sCfg.color}`,
                  borderRadius: 12,
                  padding: '14px 16px',
                  opacity: isDone ? 0.85 : 1,
                  transition: 'all 0.2s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>

                    {/* Stop number */}
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                      background: isDone ? '#059669' : sCfg.color,
                      color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: '0.85rem',
                      boxShadow: `0 2px 8px ${sCfg.color}40`,
                    }}>
                      {isDone ? <Icon name="check" size={16} /> : stop.stop_order}
                    </div>

                    {/* Main info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b' }}>
                          #{o?.order_number} — {o?.profiles?.name ?? '—'}
                        </span>
                        {isUpdating && (
                          <Icon name="progress_activity" size={14} style={{ color: '#7c3aed', animation: 'admin-spin 0.8s linear infinite' }} />
                        )}
                      </div>

                      {/* Address */}
                      <div style={{ fontSize: '0.8rem', color: '#475569', marginBottom: 6, display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                        <Icon name="location_on" size={14} fill style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {addr || '—'}
                        </span>
                      </div>

                      {/* ETA + timing row */}
                      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: '0.77rem', color: '#64748b' }}>
                        {stop.estimated_arrival && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, color: '#059669' }}>
                            <Icon name="schedule" size={13} />
                            ETA {stop.estimated_arrival}
                          </span>
                        )}
                        {stop.distance_from_prev && idx > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Icon name="straighten" size={13} />
                            {stop.distance_from_prev}
                          </span>
                        )}
                        {stop.duration_from_prev && idx > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Icon name="timer" size={13} />
                            {stop.duration_from_prev}
                          </span>
                        )}
                        {o?.profiles?.phone && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Icon name="phone" size={13} />
                            {o.profiles.phone}
                          </span>
                        )}
                        {o?.total && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, color: '#0284c7' }}>
                            <Icon name="payments" size={13} />
                            {Number(o.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status selector */}
                    <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                      <StopStatusMenu
                        currentStatus={stop.stop_status ?? 'pending'}
                        onChange={newStatus => handleStopStatusChange(stop, newStatus)}
                        disabled={isUpdating || route.status === 'cancelled'}
                      />
                      {/* Quick delivered button for active stops */}
                      {stop.stop_status !== 'delivered' && route.status === 'active' && !isUpdating && (
                        <button
                          onClick={() => handleStopStatusChange(stop, 'delivered')}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            background: 'none', border: '1px solid #a7f3d0',
                            borderRadius: 6, padding: '3px 8px', cursor: 'pointer',
                            fontSize: '0.72rem', fontWeight: 600, color: '#059669',
                          }}
                          title="Marcar como entregue"
                        >
                          <Icon name="check" size={12} style={{ color: '#059669' }} />
                          Entregue
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Maps link card */}
          {route.maps_url && (
            <div style={{
              background: '#fff', border: '1px solid #e2e8f0',
              borderRadius: 12, padding: 16,
            }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="map" size={16} style={{ color: '#0284c7' }} />
                Link da rota
              </h3>
              <div style={{
                background: '#f8fafc', border: '1px solid #e2e8f0',
                borderRadius: 8, padding: '8px 10px',
                fontFamily: 'monospace', fontSize: '0.65rem',
                color: '#64748b', wordBreak: 'break-all',
                maxHeight: 56, overflow: 'hidden',
                marginBottom: 10,
              }}>
                {route.maps_url}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className={`admin-btn ${copied ? 'admin-btn--success' : 'admin-btn--primary'}`}
                  onClick={handleCopy}
                  style={{ flex: 1, justifyContent: 'center', fontSize: '0.82rem' }}
                >
                  <Icon name={copied ? 'check' : 'content_copy'} size={15} />
                  {copied ? 'Copiado!' : 'Copiar link'}
                </button>
                <a
                  href={route.maps_url}
                  target="_blank"
                  rel="noreferrer"
                  className="admin-btn admin-btn--ghost"
                  style={{ fontSize: '0.82rem' }}
                >
                  <Icon name="open_in_new" size={15} />
                </a>
              </div>
            </div>
          )}

          {/* Route stats card */}
          <div style={{
            background: '#fff', border: '1px solid #e2e8f0',
            borderRadius: 12, padding: 16,
          }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="info" size={16} style={{ color: '#475569' }} />
              Detalhes da rota
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Status</span>
                <Badge cfg={routeCfg} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Data</span>
                <span style={{ fontWeight: 600, color: '#1e293b', textAlign: 'right', maxWidth: 160 }}>
                  {fmtDate(route.delivery_date)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Paradas</span>
                <span style={{ fontWeight: 600, color: '#1e293b' }}>{totalStops}</span>
              </div>
              {meta?.total_distance && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Distância</span>
                  <span style={{ fontWeight: 600, color: '#0284c7' }}>{meta.total_distance}</span>
                </div>
              )}
              {meta?.total_duration && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Tempo est.</span>
                  <span style={{ fontWeight: 600, color: '#d97706' }}>{meta.total_duration}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Otimizada</span>
                <span style={{ fontWeight: 600, color: route.is_optimized ? '#059669' : '#64748b' }}>
                  {route.is_optimized ? '✓ Sim' : 'Não'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Criada por</span>
                <span style={{ fontWeight: 600, color: '#1e293b' }}>{route.profiles?.name ?? '—'}</span>
              </div>
            </div>
          </div>

          {/* Driver card */}
          <div style={{
            background: '#fff', border: '1px solid #e2e8f0',
            borderRadius: 12, padding: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                <Icon name="person_pin" size={16} style={{ color: '#7c3aed' }} />
                Entregador
              </h3>
              <div style={{ position: 'relative' }}>
                <button
                  className="admin-btn admin-btn--ghost"
                  style={{ padding: '3px 10px', fontSize: '0.75rem' }}
                  onClick={() => setDriverOpen(v => !v)}
                  disabled={savingDriver}
                >
                  <Icon name={savingDriver ? 'progress_activity' : 'swap_horiz'} size={13} />
                  {savingDriver ? 'Salvando…' : 'Alterar'}
                </button>

                {driverOpen && (
                  <>
                    <div onClick={() => setDriverOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 100 }} />
                    <div style={{
                      position: 'absolute', top: '110%', right: 0, zIndex: 101,
                      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
                      boxShadow: '0 8px 28px rgba(0,0,0,0.12)',
                      minWidth: 220, overflow: 'hidden',
                    }}>
                      {/* Remove option */}
                      {route.driver_id && (
                        <button
                          onClick={() => handleAssignDriver(null)}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                            padding: '9px 14px', border: 'none', cursor: 'pointer',
                            background: '#fef2f2', fontSize: '0.82rem', color: '#dc2626',
                            fontWeight: 600, textAlign: 'left',
                            borderBottom: '1px solid #f1f5f9',
                          }}
                        >
                          <Icon name="person_off" size={14} style={{ color: '#dc2626' }} />
                          Remover entregador
                        </button>
                      )}
                      {/* Active drivers */}
                      {drivers.length === 0 ? (
                        <div style={{ padding: '12px 14px', fontSize: '0.82rem', color: '#94a3b8' }}>
                          Nenhum entregador ativo.
                          <br />
                          <span style={{ fontSize: '0.75rem' }}>Cadastre em Entregadores.</span>
                        </div>
                      ) : (
                        drivers.map(d => (
                          <button
                            key={d.id}
                            onClick={() => handleAssignDriver(d)}
                            style={{
                              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                              padding: '9px 14px', border: 'none', cursor: 'pointer',
                              background: d.id === route.driver_id ? '#f5f3ff' : '#fff',
                              fontSize: '0.82rem', fontWeight: d.id === route.driver_id ? 700 : 500,
                              color: d.id === route.driver_id ? '#7c3aed' : '#374151',
                              textAlign: 'left', borderBottom: '1px solid #f1f5f9',
                            }}
                          >
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                              background: d.id === route.driver_id ? '#f5f3ff' : '#f8fafc',
                              border: `1.5px solid ${d.id === route.driver_id ? '#ddd6fe' : '#e2e8f0'}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 800, fontSize: '0.78rem',
                              color: d.id === route.driver_id ? '#7c3aed' : '#94a3b8',
                            }}>
                              {d.name.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {d.name}
                              </div>
                              {d.phone && (
                                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{d.phone}</div>
                              )}
                            </div>
                            {d.id === route.driver_id && (
                              <Icon name="check" size={14} style={{ color: '#7c3aed', flexShrink: 0 }} />
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Display current driver */}
            {route.driver_name ? (
              <div style={{ fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: '#f5f3ff', border: '2px solid #ddd6fe',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '0.95rem', color: '#7c3aed', flexShrink: 0,
                  }}>
                    {route.driver_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#1e293b' }}>{route.driver_name}</div>
                    {route.driver_phone && (
                      <div style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <Icon name="phone" size={12} />
                        {route.driver_phone}
                      </div>
                    )}
                    {!route.driver_id && (
                      <div style={{ fontSize: '0.68rem', color: '#d97706', marginTop: 2 }}>
                        Atribuído manualmente
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '10px 0' }}>
                <Icon name="person_off" size={28} style={{ color: '#e2e8f0' }} />
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center' }}>
                  Nenhum entregador atribuído
                </span>
              </div>
            )}
          </div>

          {/* Danger zone */}
          {route.status === 'active' && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 12, padding: 16,
            }}>
              <h3 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#dc2626', marginBottom: 8 }}>
                Ações da rota
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button
                  className="admin-btn admin-btn--primary"
                  style={{ background: '#059669', borderColor: '#059669', justifyContent: 'center', fontSize: '0.82rem' }}
                  onClick={() => handleRouteStatusChange('completed')}
                >
                  <Icon name="check_circle" size={15} fill /> Concluir rota manualmente
                </button>
                <button
                  className="admin-btn admin-btn--ghost"
                  style={{ borderColor: '#dc2626', color: '#dc2626', justifyContent: 'center', fontSize: '0.82rem' }}
                  onClick={() => handleRouteStatusChange('cancelled')}
                >
                  <Icon name="cancel" size={15} fill /> Cancelar rota
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
