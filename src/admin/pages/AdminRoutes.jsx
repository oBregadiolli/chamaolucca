import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/ui/Icon';
import { fetchAllRoutes } from '../services/adminRoutes';

// ─── Helpers ─────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

const ROUTE_STATUS = {
  draft:     { label: 'Rascunho',  color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', icon: 'edit_note'    },
  active:    { label: 'Ativa',     color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', icon: 'two_wheeler'  },
  completed: { label: 'Concluída', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', icon: 'check_circle' },
  cancelled: { label: 'Cancelada', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: 'cancel'       },
};

function RouteBadge({ status }) {
  const cfg = ROUTE_STATUS[status] ?? ROUTE_STATUS.draft;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
    }}>
      <Icon name={cfg.icon} size={13} fill style={{ color: cfg.color }} />
      {cfg.label}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────
export default function AdminRoutes() {
  const navigate = useNavigate();
  const [routes,  setRoutes]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('all');
  const [copied,  setCopied]  = useState(null); // routeId that was just copied

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllRoutes();
      setRoutes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCopy(e, mapsUrl, routeId) {
    e.stopPropagation();
    await navigator.clipboard.writeText(mapsUrl);
    setCopied(routeId);
    setTimeout(() => setCopied(null), 2000);
  }

  const filtered = routes.filter(r => filter === 'all' || r.status === filter);
  const counts   = routes.reduce((acc, r) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc; }, {});

  return (
    <div className="admin-page">

      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Rotas de Entrega</h1>
          <p className="admin-page-subtitle">
            {loading ? 'Carregando…' : `${routes.length} rota(s) · ${filtered.length} exibida(s)`}
          </p>
        </div>
        <button className="admin-btn admin-btn--ghost" onClick={load} disabled={loading}>
          <Icon name={loading ? 'progress_activity' : 'refresh'} size={16} /> Atualizar
        </button>
      </div>

      {/* Filter tabs */}
      <div className="admin-status-tabs" style={{ marginBottom: 20 }}>
        <button
          className={`admin-status-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Todas <span className="admin-tab-count">{routes.length}</span>
        </button>
        {Object.entries(ROUTE_STATUS).map(([key, cfg]) => (
          <button
            key={key}
            className={`admin-status-tab ${filter === key ? 'active' : ''}`}
            style={filter === key ? { borderColor: cfg.border, color: cfg.color, background: cfg.bg } : {}}
            onClick={() => setFilter(key)}
          >
            <Icon name={cfg.icon} size={15} fill style={{ color: filter === key ? cfg.color : undefined }} />
            {cfg.label}
            {counts[key] ? (
              <span className="admin-tab-count" style={filter === key ? { background: cfg.border, color: cfg.color } : {}}>
                {counts[key]}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18 }}>
              {[160, 100, 80, 60].map((w, j) => (
                <div key={j} className="admin-skeleton" style={{ width: w, height: 13, marginBottom: 10 }} />
              ))}
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="admin-no-results">
          <Icon name="route" size={40} className="admin-no-results-icon" />
          <p className="admin-no-results-title">Nenhuma rota encontrada</p>
          <p className="admin-no-results-text">
            Crie rotas selecionando pedidos em "Preparando" na tela de Pedidos.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {filtered.map(route => {
            const cfg        = ROUTE_STATUS[route.status] ?? ROUTE_STATUS.draft;
            const stops      = route.route_stops ?? [];
            const stopCount  = stops.length;
            const delivered  = stops.filter(s => s.stop_status === 'delivered').length;
            const issues     = stops.filter(s => s.stop_status === 'issue').length;
            const progress   = stopCount > 0 ? Math.round((delivered / stopCount) * 100) : 0;
            const meta       = route.route_metadata;
            const isCopied   = copied === route.id;

            return (
              <div
                key={route.id}
                onClick={() => navigate(`/admin/rotas/${route.id}`)}
                style={{
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderLeft: `4px solid ${cfg.color}`,
                  borderRadius: 14,
                  padding: 18,
                  cursor: 'pointer',
                  transition: 'box-shadow 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              >
                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1e293b', flex: 1, minWidth: 0, marginRight: 8 }}>
                    <Icon name="route" size={15} style={{ marginRight: 5, verticalAlign: 'middle', color: cfg.color }} />
                    {route.name}
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexShrink: 0, alignItems: 'center' }}>
                    {route.is_optimized && (
                      <span title="Rota otimizada" style={{
                        display: 'flex', alignItems: 'center',
                        padding: '2px 6px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700,
                        background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0',
                      }}>
                        <Icon name="auto_awesome" size={11} fill style={{ color: '#059669' }} />
                      </span>
                    )}
                    {route.batch_id && (
                      <span title="Parte de um lote dividido" style={{
                        display: 'flex', alignItems: 'center', gap: 3,
                        padding: '2px 7px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700,
                        background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a',
                      }}>
                        <Icon name="call_split" size={11} style={{ color: '#d97706' }} />
                        {route.batch_index ?? '?'}
                      </span>
                    )}
                    <RouteBadge status={route.status} />
                  </div>
                </div>

                {/* Date */}
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 10 }}>
                  <Icon name="calendar_today" size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                  {fmtDate(route.delivery_date)}
                  {route.driver_name && (
                    <span style={{ marginLeft: 8, color: '#7c3aed', fontWeight: 600 }}>
                      <Icon name="person" size={13} style={{ marginRight: 2, verticalAlign: 'middle' }} />
                      {route.driver_name}
                    </span>
                  )}
                </div>

                {/* Stats row */}
                <div style={{ display: 'flex', gap: 14, fontSize: '0.8rem', color: '#475569', marginBottom: 10, flexWrap: 'wrap' }}>
                  <span>
                    <Icon name="place" size={13} fill style={{ marginRight: 3, verticalAlign: 'middle', color: '#7c3aed' }} />
                    {stopCount} parada{stopCount !== 1 ? 's' : ''}
                  </span>
                  {delivered > 0 && (
                    <span style={{ color: '#059669', fontWeight: 600 }}>
                      <Icon name="check_circle" size={13} fill style={{ marginRight: 3, verticalAlign: 'middle' }} />
                      {delivered} entregue{delivered !== 1 ? 's' : ''}
                    </span>
                  )}
                  {issues > 0 && (
                    <span style={{ color: '#dc2626', fontWeight: 600 }}>
                      <Icon name="error" size={13} fill style={{ marginRight: 3, verticalAlign: 'middle' }} />
                      {issues} problema{issues !== 1 ? 's' : ''}
                    </span>
                  )}
                  {meta?.total_distance && (
                    <span>
                      <Icon name="straighten" size={13} style={{ marginRight: 3, verticalAlign: 'middle', color: '#0284c7' }} />
                      {meta.total_distance}
                    </span>
                  )}
                  {meta?.total_duration && (
                    <span>
                      <Icon name="timer" size={13} style={{ marginRight: 3, verticalAlign: 'middle', color: '#d97706' }} />
                      {meta.total_duration}
                    </span>
                  )}
                </div>

                {/* Progress bar (only for active routes with some progress) */}
                {route.status === 'active' && stopCount > 0 && delivered > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ height: 5, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${progress}%`,
                        background: progress === 100 ? '#059669' : '#7c3aed',
                        borderRadius: 99, transition: 'width 0.4s',
                      }} />
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: 3 }}>
                      {progress}% concluído
                    </div>
                  </div>
                )}

                {/* Actions row */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                  <button
                    className="admin-btn admin-btn--ghost"
                    style={{ flex: 1, fontSize: '0.75rem', padding: '5px 8px', justifyContent: 'center' }}
                    onClick={e => { e.stopPropagation(); navigate(`/admin/rotas/${route.id}`); }}
                  >
                    <Icon name="open_in_new" size={13} /> Ver detalhe
                  </button>
                  {route.maps_url && (
                    <>
                      <button
                        className={`admin-btn ${isCopied ? 'admin-btn--success' : 'admin-btn--ghost'}`}
                        style={{ flex: 1, fontSize: '0.75rem', padding: '5px 8px', justifyContent: 'center' }}
                        onClick={e => handleCopy(e, route.maps_url, route.id)}
                      >
                        <Icon name={isCopied ? 'check' : 'content_copy'} size={13} />
                        {isCopied ? 'Copiado!' : 'Copiar link'}
                      </button>
                      <a
                        href={route.maps_url}
                        target="_blank"
                        rel="noreferrer"
                        className="admin-btn admin-btn--ghost"
                        style={{ fontSize: '0.75rem', padding: '5px 8px' }}
                        onClick={e => e.stopPropagation()}
                        title="Abrir no Maps"
                      >
                        <Icon name="map" size={13} />
                      </a>
                    </>
                  )}
                </div>

                {/* Subtle timestamp */}
                <div style={{ fontSize: '0.68rem', color: '#cbd5e1', marginTop: 8 }}>
                  Criada {fmtDateTime(route.created_at)}
                  {route.profiles?.name && ` por ${route.profiles.name}`}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
