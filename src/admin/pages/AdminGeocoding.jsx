import { useCallback, useEffect, useState } from 'react';
import Icon from '../../components/ui/Icon';
import {
  fetchGeocodingStats,
  fetchNonGeocodedOrders,
  geocodeBatch,
  geocodeOrder,
} from '../services/adminGeocoding';

// ─── Helpers ──────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function ProgressBar({ value, max, color = '#7c3aed' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ background: '#f1f5f9', borderRadius: 999, height: 8, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999, transition: 'width 0.4s ease' }} />
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color = '#1e293b', sub }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
      padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        <Icon name={icon} size={15} style={{ color }} />
        {label}
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 800, color, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{sub}</div>}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────
export default function AdminGeocoding() {
  const [stats,        setStats]        = useState(null);
  const [pending,      setPending]      = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingList,  setLoadingList]  = useState(true);
  const [batching,     setBatching]     = useState(false);
  const [batchResult,  setBatchResult]  = useState(null);
  const [singleStates, setSingleStates] = useState({}); // { [orderId]: 'loading'|'ok'|'error' }
  const [toast,        setToast]        = useState(null);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const s = await fetchGeocodingStats();
      setStats(s);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const loadPending = useCallback(async () => {
    setLoadingList(true);
    try {
      const rows = await fetchNonGeocodedOrders(100);
      setPending(rows);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadPending();
  }, [loadStats, loadPending]);

  async function handleBatch() {
    setBatching(true);
    setBatchResult(null);
    try {
      const result = await geocodeBatch(50);
      setBatchResult(result);
      setToast({
        type: 'success',
        msg: `Lote concluído: ${result.succeeded} geocodificados, ${result.failed} falhas.`,
      });
      await loadStats();
      await loadPending();
    } catch (e) {
      setToast({ type: 'error', msg: `Erro no lote: ${e.message}` });
    } finally {
      setBatching(false);
    }
  }

  async function handleSingle(orderId) {
    setSingleStates(prev => ({ ...prev, [orderId]: 'loading' }));
    try {
      const result = await geocodeOrder(orderId);
      if (result.ok) {
        setSingleStates(prev => ({ ...prev, [orderId]: 'ok' }));
        setPending(prev => prev.filter(o => o.id !== orderId));
        setStats(prev => prev ? { ...prev, geocoded: prev.geocoded + 1, pending: prev.pending - 1 } : prev);
      } else {
        setSingleStates(prev => ({ ...prev, [orderId]: 'error' }));
      }
    } catch {
      setSingleStates(prev => ({ ...prev, [orderId]: 'error' }));
    }
  }

  const pct = stats && stats.total > 0 ? Math.round((stats.geocoded / stats.total) * 100) : 0;

  return (
    <div className="admin-page">
      {/* Toast */}
      {toast && (
        <div
          className={`admin-toast admin-toast--${toast.type}`}
          style={{ cursor: 'pointer' }}
          onClick={() => setToast(null)}
        >
          <Icon name={toast.type === 'success' ? 'check' : 'close'} size={16} />
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Geocodificação de Endereços</h1>
          <p className="admin-page-subtitle">
            Converte endereços dos pedidos em lat/lng para otimização de rotas
          </p>
        </div>
        <button
          className="admin-btn admin-btn--ghost"
          onClick={() => { loadStats(); loadPending(); }}
          disabled={loadingStats || loadingList}
        >
          <Icon name="refresh" size={16} /> Atualizar
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', marginBottom: 20 }}>
        {loadingStats ? (
          [1, 2, 3].map(i => (
            <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
              <div className="admin-skeleton" style={{ width: 80, height: 12, marginBottom: 10 }} />
              <div className="admin-skeleton" style={{ width: 50, height: 28 }} />
            </div>
          ))
        ) : (
          <>
            <StatCard label="Total ativos" value={stats?.total ?? 0} icon="package_2" color="#1e293b" />
            <StatCard
              label="Geocodificados"
              value={stats?.geocoded ?? 0}
              icon="location_on"
              color="#059669"
              sub={`${pct}% do total`}
            />
            <StatCard
              label="Sem geocódigo"
              value={stats?.pending ?? 0}
              icon="location_off"
              color={stats?.pending > 0 ? '#d97706' : '#94a3b8'}
              sub={stats?.pending === 0 ? 'Tudo geocodificado ✓' : 'Precisam de atenção'}
            />
          </>
        )}
      </div>

      {/* Progress bar */}
      {!loadingStats && stats && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
              Cobertura de geocodificação
            </span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: pct === 100 ? '#059669' : '#7c3aed' }}>
              {pct}%
            </span>
          </div>
          <ProgressBar value={stats.geocoded} max={stats.total} color={pct === 100 ? '#059669' : '#7c3aed'} />
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 6 }}>
            {stats.geocoded} de {stats.total} pedidos com coordenadas
          </div>
        </div>
      )}

      {/* Batch action */}
      {stats?.pending > 0 && (
        <div style={{
          background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12,
          padding: '16px 20px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#92400e', marginBottom: 3 }}>
              <Icon name="warning" size={15} fill style={{ marginRight: 5, verticalAlign: 'middle', color: '#d97706' }} />
              {stats.pending} {stats.pending === 1 ? 'pedido sem' : 'pedidos sem'} lat/lng
            </div>
            <div style={{ fontSize: '0.8rem', color: '#a16207' }}>
              Geocodifica até 50 pedidos por vez. O processo leva ~1 minuto.
            </div>
          </div>
          <button
            className="admin-btn admin-btn--primary"
            onClick={handleBatch}
            disabled={batching}
            style={{ background: '#d97706', borderColor: '#d97706', whiteSpace: 'nowrap' }}
          >
            <Icon name={batching ? 'progress_activity' : 'my_location'} size={16} />
            {batching ? 'Geocodificando…' : `Geocodificar lote (50 pedidos)`}
          </button>
        </div>
      )}

      {/* Batch result */}
      {batchResult && (
        <div style={{
          background: '#f0fdf4', border: '1px solid #a7f3d0', borderRadius: 10,
          padding: '12px 16px', marginBottom: 16, fontSize: '0.83rem', color: '#065f46',
        }}>
          <strong>Resultado do lote:</strong> {batchResult.succeeded} geocodificados ·{' '}
          {batchResult.skipped ?? 0} já tinham coordenadas ·{' '}
          {batchResult.failed} falhas — de {batchResult.total} pedidos processados.
        </div>
      )}

      {/* Pending list */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid #f1f5f9',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h2 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>
            Pedidos sem geocódigo
            {!loadingList && <span style={{ fontSize: '0.78rem', fontWeight: 400, color: '#94a3b8', marginLeft: 8 }}>({pending.length} listados)</span>}
          </h2>
        </div>

        {loadingList ? (
          <div style={{ padding: 20 }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center' }}>
                <div className="admin-skeleton" style={{ width: 50, height: 14 }} />
                <div className="admin-skeleton" style={{ flex: 1, height: 14 }} />
                <div className="admin-skeleton" style={{ width: 90, height: 28, borderRadius: 8 }} />
              </div>
            ))}
          </div>
        ) : pending.length === 0 ? (
          <div className="admin-no-results" style={{ padding: '40px 24px' }}>
            <Icon name="check_circle" size={40} style={{ color: '#059669', opacity: 0.7, display: 'block', margin: '0 auto 12px' }} />
            <p className="admin-no-results-title" style={{ color: '#059669' }}>Todos os pedidos têm coordenadas!</p>
            <p className="admin-no-results-text">A base está pronta para otimização de rotas.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: 70 }}>#</th>
                  <th>Endereço de entrega</th>
                  <th style={{ width: 100 }}>Status</th>
                  <th style={{ width: 120 }}>Pedido em</th>
                  <th style={{ width: 130 }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {pending.map(order => {
                  const state = singleStates[order.id];
                  const addr  = [order.delivery_address, order.neighborhood].filter(Boolean).join(', ') || '—';
                  return (
                    <tr key={order.id}>
                      <td className="admin-table-num">#{order.order_number}</td>
                      <td>
                        <div style={{ fontSize: '0.85rem', color: '#1e293b', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {addr}
                        </div>
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-block', padding: '2px 8px', borderRadius: 999,
                          fontSize: '0.72rem', fontWeight: 600,
                          background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0',
                          textTransform: 'capitalize',
                        }}>
                          {order.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{fmtDate(order.created_at)}</td>
                      <td>
                        {state === 'ok' ? (
                          <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600 }}>
                            <Icon name="check_circle" size={14} fill style={{ marginRight: 4 }} />
                            Geocodificado
                          </span>
                        ) : state === 'error' ? (
                          <button
                            className="admin-btn admin-btn--ghost"
                            style={{ fontSize: '0.78rem', padding: '5px 10px', color: '#dc2626', borderColor: '#fca5a5' }}
                            onClick={() => handleSingle(order.id)}
                          >
                            <Icon name="refresh" size={14} style={{ marginRight: 4 }} />
                            Tentar novamente
                          </button>
                        ) : (
                          <button
                            className="admin-btn admin-btn--ghost"
                            style={{ fontSize: '0.78rem', padding: '5px 10px' }}
                            onClick={() => handleSingle(order.id)}
                            disabled={state === 'loading'}
                          >
                            <Icon name={state === 'loading' ? 'progress_activity' : 'my_location'} size={14} />
                            {state === 'loading' ? 'Buscando…' : 'Geocodificar'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loadingList && stats?.pending > 100 && (
        <div style={{ fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center', marginTop: 12 }}>
          Exibindo os 100 primeiros. Use "Geocodificar lote" para processar em sequência.
        </div>
      )}
    </div>
  );
}
