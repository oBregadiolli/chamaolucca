import { useCallback, useEffect, useState } from 'react';
import Icon from '../../components/ui/Icon';
import {
  createDriver,
  deleteDriver,
  fetchAllDrivers,
  fetchDriverWithRoutes,
  toggleDriverActive,
  updateDriver,
} from '../services/adminDrivers';

// ─── Helpers ──────────────────────────────────────────────────────────
const ROUTE_STATUS_COLORS = {
  active:    { color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', label: 'Ativa'     },
  completed: { color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', label: 'Concluída' },
  cancelled: { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', label: 'Cancelada' },
  draft:     { color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', label: 'Rascunho'  },
};

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

// ─── Driver form (create / edit) ──────────────────────────────────────
function DriverForm({ initial, onSave, onCancel, saving }) {
  const [name,  setName]  = useState(initial?.name  ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name, phone, notes });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 5 }}>
          Nome *
        </label>
        <input
          autoFocus
          className="admin-search"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Nome completo do entregador"
          required
          style={{ width: '100%', fontSize: '0.88rem' }}
        />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 5 }}>
          Telefone
        </label>
        <input
          className="admin-search"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="(71) 99999-0000"
          style={{ width: '100%', fontSize: '0.88rem' }}
        />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 5 }}>
          Observações
        </label>
        <textarea
          className="admin-search"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Ex: Trabalha segunda a sábado, usa moto"
          rows={2}
          style={{ width: '100%', fontSize: '0.85rem', resize: 'vertical', fontFamily: 'inherit' }}
        />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button type="button" className="admin-btn admin-btn--ghost" onClick={onCancel} style={{ flex: 1 }}>
          Cancelar
        </button>
        <button
          type="submit"
          className="admin-btn admin-btn--primary"
          disabled={saving || !name.trim()}
          style={{ flex: 2, justifyContent: 'center' }}
        >
          <Icon name={saving ? 'progress_activity' : 'save'} size={15} fill />
          {saving ? 'Salvando…' : initial ? 'Salvar alterações' : 'Criar entregador'}
        </button>
      </div>
    </form>
  );
}

// ─── Driver Detail Panel ──────────────────────────────────────────────
function DriverDetail({ driverId, onClose, onUpdated }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [confirm, setConfirm] = useState(false);  // delete confirm

  useEffect(() => {
    setLoading(true);
    fetchDriverWithRoutes(driverId)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [driverId]);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSave(fields) {
    setSaving(true);
    try {
      const updated = await updateDriver(driverId, fields);
      setData(d => ({ ...d, driver: updated }));
      setEditing(false);
      onUpdated?.(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle() {
    const updated = await toggleDriverActive(driverId, data.driver.active);
    setData(d => ({ ...d, driver: updated }));
    onUpdated?.(updated);
  }

  async function handleDelete() {
    await deleteDriver(driverId);
    onClose();
    onUpdated?.();
  }

  const driver = data?.driver;
  const routes = data?.routes ?? [];
  const activeRoutes = routes.filter(r => r.status === 'active').length;

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div
        className="admin-modal admin-modal--order"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 520, maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="admin-modal-header admin-modal-header--colored" style={{ borderBottom: '3px solid #ddd6fe' }}>
          <div className="admin-modal-header-left">
            {driver ? (
              <>
                <span className="admin-order-num" style={{ fontSize: '0.95rem' }}>
                  <Icon name="person_pin" size={16} style={{ marginRight: 4, verticalAlign: 'middle', color: '#7c3aed' }} />
                  {driver.name}
                </span>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '2px 8px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600,
                  background: driver.active ? '#ecfdf5' : '#f8fafc',
                  color:      driver.active ? '#059669' : '#64748b',
                  border:    `1px solid ${driver.active ? '#a7f3d0' : '#e2e8f0'}`,
                }}>
                  {driver.active ? 'Ativo' : 'Inativo'}
                </span>
              </>
            ) : (
              <div className="admin-skeleton" style={{ width: 180, height: 20 }} />
            )}
          </div>
          <button className="admin-modal-close" onClick={onClose} aria-label="Fechar">
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="admin-modal-body" style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div className="admin-modal-skeleton">
              {[160, 120, 100, 180].map((w, i) => (
                <div key={i} className="admin-skeleton" style={{ width: w, height: 14, marginBottom: 12 }} />
              ))}
            </div>
          ) : driver && (
            <>
              {/* Info or Edit form */}
              {editing ? (
                <div className="admin-detail-section">
                  <DriverForm
                    initial={driver}
                    onSave={handleSave}
                    onCancel={() => setEditing(false)}
                    saving={saving}
                  />
                </div>
              ) : (
                <div className="admin-detail-section">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <h3 className="admin-detail-section-title" style={{ margin: 0 }}>Dados</h3>
                    <button className="admin-btn admin-btn--ghost" style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                      onClick={() => setEditing(true)}>
                      <Icon name="edit" size={13} /> Editar
                    </button>
                  </div>
                  <div className="admin-detail-grid">
                    <div className="admin-detail-item">
                      <span className="admin-detail-label">Nome</span>
                      <span className="admin-detail-value">{driver.name}</span>
                    </div>
                    <div className="admin-detail-item">
                      <span className="admin-detail-label">Telefone</span>
                      <span className="admin-detail-value">{driver.phone || '—'}</span>
                    </div>
                    {driver.notes && (
                      <div className="admin-detail-item" style={{ gridColumn: '1 / -1' }}>
                        <span className="admin-detail-label">Observações</span>
                        <span className="admin-detail-value">{driver.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              {!editing && (
                <div className="admin-detail-section">
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="admin-btn admin-btn--ghost"
                      style={{ flex: 1 }}
                      onClick={handleToggle}
                    >
                      <Icon name={driver.active ? 'pause_circle' : 'play_circle'} size={15} fill />
                      {driver.active ? 'Desativar' : 'Reativar'}
                    </button>
                    {!confirm ? (
                      <button
                        className="admin-btn admin-btn--ghost"
                        style={{ flex: 1, borderColor: '#fecaca', color: '#dc2626' }}
                        onClick={() => setConfirm(true)}
                        disabled={activeRoutes > 0}
                        title={activeRoutes > 0 ? `Entregador tem ${activeRoutes} rota(s) ativa(s)` : ''}
                      >
                        <Icon name="delete_outline" size={15} />
                        Excluir
                      </button>
                    ) : (
                      <div style={{ flex: 1, display: 'flex', gap: 6 }}>
                        <button className="admin-btn admin-btn--ghost" style={{ flex: 1 }} onClick={() => setConfirm(false)}>
                          Não
                        </button>
                        <button
                          className="admin-btn admin-btn--danger"
                          style={{ background: '#dc2626', color: '#fff', border: 'none', flex: 1, justifyContent: 'center', borderRadius: 8, fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px' }}
                          onClick={handleDelete}
                        >
                          <Icon name="delete" size={14} /> Confirmar
                        </button>
                      </div>
                    )}
                  </div>
                  {activeRoutes > 0 && (
                    <p style={{ fontSize: '0.75rem', color: '#d97706', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Icon name="warning" size={13} fill style={{ color: '#d97706' }} />
                      Entregador tem {activeRoutes} rota(s) ativa(s). Reatribua antes de excluir.
                    </p>
                  )}
                </div>
              )}

              {/* Routes */}
              <div className="admin-detail-section">
                <h3 className="admin-detail-section-title">
                  Rotas atribuídas
                  <span style={{ fontSize: '0.72rem', fontWeight: 400, color: '#94a3b8', marginLeft: 8 }}>
                    últimas 20
                  </span>
                </h3>
                {routes.length === 0 ? (
                  <div style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0' }}>
                    <Icon name="route" size={16} style={{ color: '#e2e8f0' }} />
                    Nenhuma rota atribuída
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {routes.map(r => {
                      const cfg      = ROUTE_STATUS_COLORS[r.status] ?? ROUTE_STATUS_COLORS.draft;
                      const stops    = r.route_stops ?? [];
                      const done     = stops.filter(s => s.stop_status === 'delivered').length;
                      const meta     = r.route_metadata;
                      return (
                        <div key={r.id} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '9px 12px', borderRadius: 8,
                          border: '1px solid #f1f5f9', background: '#f8fafc',
                        }}>
                          <Icon name="route" size={15} fill style={{ color: cfg.color, flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {r.name}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                              {fmtDate(r.delivery_date)}
                              {stops.length > 0 && ` · ${done}/${stops.length} entregues`}
                              {meta?.total_distance && ` · ${meta.total_distance}`}
                            </div>
                          </div>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center',
                            padding: '2px 8px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700,
                            background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
                            whiteSpace: 'nowrap',
                          }}>
                            {cfg.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────
export default function AdminDrivers() {
  const [drivers,    setDrivers]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [creating,   setCreating]   = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [filter,     setFilter]     = useState('all'); // 'all' | 'active' | 'inactive'
  const [toast,      setToast]      = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllDrivers();
      setDrivers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleCreate(fields) {
    setSaving(true);
    try {
      const driver = await createDriver(fields);
      setDrivers(prev => [driver, ...prev].sort((a, b) => a.name.localeCompare(b.name)));
      setCreating(false);
      showToast(`"${driver.name}" criado com sucesso!`);
    } catch (e) {
      showToast('Erro ao criar entregador.', 'error');
    } finally {
      setSaving(false);
    }
  }

  function handleUpdated(updatedDriver) {
    if (!updatedDriver) {
      // deleted
      load();
      return;
    }
    setDrivers(prev =>
      prev
        .map(d => d.id === updatedDriver.id ? updatedDriver : d)
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
  }

  async function handleQuickToggle(e, driver) {
    e.stopPropagation();
    try {
      const updated = await toggleDriverActive(driver.id, driver.active);
      handleUpdated(updated);
      showToast(`${updated.name} ${updated.active ? 'reativado' : 'desativado'}.`);
    } catch {
      showToast('Erro ao atualizar.', 'error');
    }
  }

  const filtered = drivers.filter(d => {
    if (filter === 'active')   return d.active;
    if (filter === 'inactive') return !d.active;
    return true;
  });

  const activeCount   = drivers.filter(d => d.active).length;
  const inactiveCount = drivers.filter(d => !d.active).length;

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

      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Entregadores</h1>
          <p className="admin-page-subtitle">
            {loading ? 'Carregando…' : `${activeCount} ativo(s) · ${inactiveCount} inativo(s)`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="admin-btn admin-btn--ghost" onClick={load} disabled={loading}>
            <Icon name={loading ? 'progress_activity' : 'refresh'} size={16} />
          </button>
          <button
            className="admin-btn admin-btn--primary"
            onClick={() => setCreating(true)}
          >
            <Icon name="person_add" size={16} fill />
            Novo entregador
          </button>
        </div>
      </div>

      {/* Create form */}
      {creating && (
        <div style={{
          background: '#fff', border: '1px solid #ddd6fe',
          borderRadius: 12, padding: 20, marginBottom: 20,
          boxShadow: '0 4px 20px rgba(124,58,237,0.08)',
        }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="person_add" size={18} style={{ color: '#7c3aed' }} />
            Novo entregador
          </h3>
          <DriverForm
            onSave={handleCreate}
            onCancel={() => setCreating(false)}
            saving={saving}
          />
        </div>
      )}

      {/* Filter tabs */}
      <div className="admin-status-tabs" style={{ marginBottom: 16 }}>
        {[
          { key: 'all',      label: 'Todos',     count: drivers.length },
          { key: 'active',   label: 'Ativos',    count: activeCount },
          { key: 'inactive', label: 'Inativos',  count: inactiveCount },
        ].map(tab => (
          <button
            key={tab.key}
            className={`admin-status-tab ${filter === tab.key ? 'active' : ''}`}
            onClick={() => setFilter(tab.key)}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="admin-tab-count">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Driver list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div className="admin-skeleton" style={{ width: 44, height: 44, borderRadius: '50%' }} />
                <div style={{ flex: 1 }}>
                  {[140, 100].map((w, j) => (
                    <div key={j} className="admin-skeleton" style={{ width: w, height: 13, marginBottom: 8 }} />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="admin-no-results">
          <Icon name="person_off" size={40} className="admin-no-results-icon" />
          <p className="admin-no-results-title">
            {filter === 'all' ? 'Nenhum entregador cadastrado' : `Nenhum entregador ${filter === 'active' ? 'ativo' : 'inativo'}`}
          </p>
          {filter === 'all' && (
            <button className="admin-btn admin-btn--primary" onClick={() => setCreating(true)}>
              <Icon name="person_add" size={16} /> Cadastrar entregador
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(driver => (
            <div
              key={driver.id}
              onClick={() => setSelectedId(driver.id)}
              style={{
                background: '#fff',
                border: `1px solid ${driver.active ? '#e2e8f0' : '#f1f5f9'}`,
                borderLeft: `4px solid ${driver.active ? '#7c3aed' : '#e2e8f0'}`,
                borderRadius: 12,
                padding: '14px 16px',
                cursor: 'pointer',
                opacity: driver.active ? 1 : 0.65,
                transition: 'box-shadow 0.15s, opacity 0.15s',
                display: 'flex', alignItems: 'center', gap: 14,
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >
              {/* Avatar */}
              <div style={{
                width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                background: driver.active ? '#f5f3ff' : '#f8fafc',
                border: `2px solid ${driver.active ? '#ddd6fe' : '#e2e8f0'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: '1rem',
                color: driver.active ? '#7c3aed' : '#94a3b8',
              }}>
                {driver.name.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {driver.name}
                  {!driver.active && (
                    <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#94a3b8', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1px 7px', borderRadius: 99 }}>
                      Inativo
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {driver.phone && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Icon name="phone" size={13} />
                      {driver.phone}
                    </span>
                  )}
                  {driver.notes && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                      <Icon name="notes" size={13} />
                      {driver.notes}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button
                  className="admin-btn admin-btn--ghost"
                  style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                  onClick={e => handleQuickToggle(e, driver)}
                  title={driver.active ? 'Desativar' : 'Reativar'}
                >
                  <Icon name={driver.active ? 'pause_circle' : 'play_circle'} size={14} fill
                    style={{ color: driver.active ? '#d97706' : '#059669' }} />
                </button>
                <button
                  className="admin-btn admin-btn--ghost"
                  style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                  onClick={e => { e.stopPropagation(); setSelectedId(driver.id); }}
                >
                  <Icon name="open_in_new" size={13} /> Detalhes
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Driver detail modal */}
      {selectedId && (
        <DriverDetail
          driverId={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdated={updated => {
            handleUpdated(updated);
            if (!updated) setSelectedId(null); // deleted
          }}
        />
      )}
    </div>
  );
}
