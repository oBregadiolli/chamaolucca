import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Icon from '../../components/ui/Icon';

/**
 * AssignDriverModal
 * Usado em dois fluxos:
 *   1. Pedido único → mudar status para "delivering"
 *   2. Criação de rota → selecionar entregador antes de salvar
 *
 * Props:
 *   orderLabel   – string exibida no topo (ex: "Pedido #10015" ou "Rota — 3 paradas")
 *   address      – endereço de entrega (string, opcional)
 *   onConfirm    – (driver | null) => void  (null = sem entregador)
 *   onCancel     – () => void
 */
export default function AssignDriverModal({ orderLabel, address, onConfirm, onCancel }) {
  const [drivers,  setDrivers]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null); // driver object | null

  useEffect(() => {
    supabase
      .from('drivers')
      .select('id, name, phone')
      .eq('active', true)
      .order('name')
      .then(({ data }) => { setDrivers(data ?? []); setLoading(false); });
  }, []);

  const whatsappUrl = (driver) => {
    if (!driver?.phone || !address) return null;
    const digits = driver.phone.replace(/\D/g, '');
    const full   = digits.startsWith('55') ? digits : `55${digits}`;
    const msg    = encodeURIComponent(`Olá ${driver.name}! Você tem uma entrega para:\n\n📍 ${address}\n\nBoa entrega! 🛵`);
    return `https://wa.me/${full}?text=${msg}`;
  };

  return (
    <div
      className="admin-modal-overlay"
      onClick={onCancel}
      style={{ zIndex: 1100 }}
    >
      <div
        className="admin-modal admin-modal--order"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 440 }}
      >
        {/* Header */}
        <div
          className="admin-modal-header admin-modal-header--colored"
          style={{ borderBottom: '3px solid #ddd6fe' }}
        >
          <div className="admin-modal-header-left">
            <span className="admin-order-num" style={{ fontSize: '0.92rem' }}>
              <Icon name="two_wheeler" size={16} style={{ marginRight: 6, verticalAlign: 'middle', color: '#7c3aed' }} />
              Atribuir Entregador
            </span>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 400 }}>
              {orderLabel}
            </span>
          </div>
          <button className="admin-modal-close" onClick={onCancel} aria-label="Fechar">
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="admin-modal-body">
          {/* Address */}
          {address && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              background: '#f8fafc', border: '1px solid #e2e8f0',
              borderRadius: 8, padding: '10px 12px', marginBottom: 16,
            }}>
              <Icon name="location_on" size={16} fill style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: '0.83rem', color: '#374151', lineHeight: 1.4 }}>{address}</span>
            </div>
          )}

          {/* Driver list */}
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 8 }}>
            Selecione o entregador:
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: '0.85rem' }}>
              <Icon name="progress_activity" size={18} style={{ animation: 'admin-spin 0.8s linear infinite' }} />
              {' '}Carregando…
            </div>
          ) : drivers.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '16px', color: '#94a3b8',
              fontSize: '0.82rem', border: '1px dashed #e2e8f0', borderRadius: 8,
            }}>
              Nenhum entregador ativo cadastrado.
              <br />
              <a href="/admin/entregadores" style={{ color: '#7c3aed', fontWeight: 600 }}>
                Cadastrar entregador →
              </a>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {drivers.map(d => {
                const isSelected = selected?.id === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => setSelected(isSelected ? null : d)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                      border: `2px solid ${isSelected ? '#7c3aed' : '#e2e8f0'}`,
                      background: isSelected ? '#f5f3ff' : '#fff',
                      textAlign: 'left', transition: 'all 0.15s',
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                      background: isSelected ? '#7c3aed' : '#f1f5f9',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon
                        name="person"
                        size={20}
                        fill
                        style={{ color: isSelected ? '#fff' : '#94a3b8' }}
                      />
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: 700, fontSize: '0.87rem',
                        color: isSelected ? '#5b21b6' : '#1e293b',
                      }}>
                        {d.name}
                      </div>
                      {d.phone && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 1 }}>
                          📱 {d.phone}
                        </div>
                      )}
                    </div>

                    {/* Check */}
                    {isSelected && (
                      <Icon name="check_circle" size={20} fill style={{ color: '#7c3aed', flexShrink: 0 }} />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* WhatsApp link for selected driver */}
          {selected && address && whatsappUrl(selected) && (
            <a
              href={whatsappUrl(selected)}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: 8, marginTop: 12,
                padding: '8px 14px', borderRadius: 8,
                background: '#dcfce7', border: '1px solid #86efac',
                color: '#166534', fontSize: '0.82rem', fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <Icon name="chat" size={16} fill style={{ color: '#16a34a' }} />
              Avisar {selected.name} pelo WhatsApp
              <Icon name="open_in_new" size={13} style={{ marginLeft: 'auto', color: '#4ade80' }} />
            </a>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 8 }}>
          <button className="admin-btn admin-btn--ghost" onClick={onCancel} style={{ flex: 1 }}>
            Cancelar
          </button>
          <button
            className="admin-btn admin-btn--ghost"
            onClick={() => onConfirm(null)}
            style={{ flex: 1, color: '#64748b' }}
            title="Continuar sem entregador"
          >
            Pular
          </button>
          <button
            className="admin-btn admin-btn--primary"
            onClick={() => onConfirm(selected)}
            style={{ flex: 2, justifyContent: 'center', background: '#7c3aed', borderColor: '#7c3aed' }}
          >
            <Icon name={selected ? 'check_circle' : 'two_wheeler'} size={16} fill />
            {selected ? `Confirmar — ${selected.name}` : 'Confirmar sem entregador'}
          </button>
        </div>
      </div>
    </div>
  );
}
