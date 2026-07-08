import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import Icon from '../../components/ui/Icon';

const EDGE_URL = import.meta.env.VITE_SUPABASE_URL + '/functions/v1';

export default function AdminSettings() {
  const [openTime,       setOpenTime]       = useState('07:00');
  const [closeTime,      setCloseTime]      = useState('23:00');
  const [citiesInput,    setCitiesInput]    = useState('Alagoinhas');
  const [cityInput,      setCityInput]      = useState('');
  const [storeCity,      setStoreCity]      = useState('Alagoinhas');
  const [storeAddress,   setStoreAddress]   = useState('');
  const [storeLat,       setStoreLat]       = useState('');
  const [storeLng,       setStoreLng]       = useState('');
  const [loading,        setLoading]        = useState(true);
  const [saving,         setSaving]         = useState(false);
  const [toast,          setToast]          = useState(null);

  // ── Freight settings ──
  const [shippingFee,        setShippingFee]        = useState('4.00');
  const [freeShippingAbove,  setFreeShippingAbove]  = useState('0');
  const [freeShippingActive, setFreeShippingActive] = useState(false);

  // ── Delivery slots ──
  const [slots,        setSlots]        = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [savingSlots,  setSavingSlots]  = useState(false);
  const capacityTimersRef              = useRef({});

  // ── Neighborhoods state ──
  const [neighborhoods,    setNeighborhoods]    = useState([]);
  const [loadingNeigh,     setLoadingNeigh]     = useState(false);
  const [newNeighborhood,  setNewNeighborhood]  = useState('');
  const [selectedCity,     setSelectedCity]     = useState('');
  const [fetchingFromIBGE, setFetchingFromIBGE] = useState(false);

  // Derived city list
  const cities = citiesInput
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);

  // ── Load settings ──
  useEffect(() => {
    supabase
      .from('store_settings')
      .select('key, value')
      .then(({ data }) => {
        if (data) {
          const map = Object.fromEntries(data.map((r) => [r.key, r.value]));
          if (map.open_time)             setOpenTime(map.open_time);
          if (map.close_time)            setCloseTime(map.close_time);
          if (map.coverage_cities)       setCitiesInput(map.coverage_cities);
          if (map.shipping_fee)          setShippingFee(map.shipping_fee);
          if (map.free_shipping_above)   setFreeShippingAbove(map.free_shipping_above);
          if (map.free_shipping_active)  setFreeShippingActive(map.free_shipping_active === 'true');
          if (map.store_city)            setStoreCity(map.store_city);
          if (map.store_address != null) setStoreAddress(map.store_address);
          if (map.store_lat     != null) setStoreLat(map.store_lat);
          if (map.store_lng     != null) setStoreLng(map.store_lng);
        }
        setLoading(false);
      });

    // Load delivery slots
    supabase.from('delivery_slots').select('*').order('sort_order').then(({ data }) => {
      setSlots(data || []);
      setLoadingSlots(false);
    });
  }, []);

  // ── Auto-select first city for neighbors tab ──
  useEffect(() => {
    if (cities.length > 0 && !selectedCity) {
      setSelectedCity(cities[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [citiesInput]);

  // ── Load neighborhoods when city selected ──
  const loadNeighborhoods = useCallback(async (city) => {
    if (!city) return;
    setLoadingNeigh(true);
    const { data } = await supabase
      .from('neighborhoods')
      .select('*')
      .eq('city', city)
      .order('name');
    setNeighborhoods(data || []);
    setLoadingNeigh(false);
  }, []);

  useEffect(() => {
    if (selectedCity) loadNeighborhoods(selectedCity);
  }, [selectedCity, loadNeighborhoods]);

  // ── Fetch from IBGE ──
  async function handleFetchFromIBGE() {
    if (!selectedCity) return;
    setFetchingFromIBGE(true);
    try {
      const res = await fetch(`${EDGE_URL}/fetch-neighborhoods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: selectedCity }),
      });
      const json = await res.json();
      if (json.neighborhoods) {
        setNeighborhoods(json.neighborhoods);
        showToast(`${json.ibge_count} bairros importados do IBGE!`, 'success');
      } else {
        showToast('Nenhum bairro encontrado no IBGE. Adicione manualmente.', 'error');
      }
    } catch {
      showToast('Erro ao buscar bairros do IBGE.', 'error');
    } finally {
      setFetchingFromIBGE(false);
    }
  }

  // ── Toggle neighborhood active/inactive ──
  async function toggleNeighborhood(id, currentActive) {
    const { error } = await supabase
      .from('neighborhoods')
      .update({ active: !currentActive })
      .eq('id', id);
    if (error) {
      showToast('Erro ao atualizar bairro.', 'error');
      return;
    }
    setNeighborhoods((prev) =>
      prev.map((n) => (n.id === id ? { ...n, active: !currentActive } : n))
    );
  }

  // ── Add neighborhood manually ──
  async function handleAddNeighborhood() {
    const name = newNeighborhood.trim();
    if (!name || !selectedCity) return;
    // Check duplicate
    if (neighborhoods.some((n) => n.name.toLowerCase() === name.toLowerCase())) {
      showToast('Bairro já existe na lista.', 'error');
      return;
    }
    const { data, error } = await supabase
      .from('neighborhoods')
      .insert({ city: selectedCity, name, active: true })
      .select()
      .single();
    if (!error && data) {
      setNeighborhoods((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewNeighborhood('');
      showToast(`"${name}" adicionado!`);
    } else {
      showToast('Erro ao adicionar bairro.', 'error');
    }
  }

  // ── Delete neighborhood ──
  async function handleDeleteNeighborhood(id, name) {
    // A4: confirmação antes de deletar — evita exclusão acidental com clique errado
    if (!window.confirm(`Remover "${name}" da lista de bairros? Esta ação não pode ser desfeita.`)) return;
    const { error } = await supabase.from('neighborhoods').delete().eq('id', id);
    if (error) {
      showToast('Erro ao remover bairro.', 'error');
      return;
    }
    setNeighborhoods((prev) => prev.filter((n) => n.id !== id));
    showToast(`"${name}" removido.`);
  }

  // ── Save settings ──
  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    const updates = [
      supabase.from('store_settings').upsert({ key: 'open_time',            value: openTime,                        label: 'Horário de abertura'                }, { onConflict: 'key' }),
      supabase.from('store_settings').upsert({ key: 'close_time',           value: closeTime,                       label: 'Horário de fechamento'             }, { onConflict: 'key' }),
      supabase.from('store_settings').upsert({ key: 'coverage_cities',      value: citiesInput,                     label: 'Cidades atendidas'                  }, { onConflict: 'key' }),
      supabase.from('store_settings').upsert({ key: 'shipping_fee',         value: String(shippingFee || '4.00'),   label: 'Valor fixo do frete (R$)'           }, { onConflict: 'key' }),
      supabase.from('store_settings').upsert({ key: 'free_shipping_above',  value: String(freeShippingAbove || '0'),label: 'Frete grátis acima de (R$)'         }, { onConflict: 'key' }),
      supabase.from('store_settings').upsert({ key: 'free_shipping_active', value: String(freeShippingActive),      label: 'Frete grátis habilitado'             }, { onConflict: 'key' }),
      supabase.from('store_settings').upsert({ key: 'store_city',           value: storeCity,                       label: 'Cidade da loja (usada na geração de rotas)'  }, { onConflict: 'key' }),
      supabase.from('store_settings').upsert({ key: 'store_address',        value: storeAddress,                    label: 'Endereço da loja (usado como origem das rotas)' }, { onConflict: 'key' }),
      supabase.from('store_settings').upsert({ key: 'store_lat',            value: storeLat,                        label: 'Latitude da loja (usado na otimização de rotas)'  }, { onConflict: 'key' }),
      supabase.from('store_settings').upsert({ key: 'store_lng',            value: storeLng,                        label: 'Longitude da loja (usado na otimização de rotas)' }, { onConflict: 'key' }),
    ];
    try {
      const results = await Promise.all(updates);
      const err = results.find((r) => r.error);
      showToast(err ? 'Erro ao salvar configurações.' : 'Configurações salvas!', err ? 'error' : 'success');
    } catch {
      showToast('Erro inesperado ao salvar.', 'error');
    } finally {
      setSaving(false);
    }
  }

  function addCity() {
    const c = cityInput.trim();
    if (!c) return;
    if (cities.map((x) => x.toLowerCase()).includes(c.toLowerCase())) return;
    const next = [...cities, c].join(', ');
    setCitiesInput(next);
    setCityInput('');
  }

  function removeCity(name) {
    const next = cities.filter((c) => c !== name).join(', ');
    setCitiesInput(next);
    if (selectedCity === name) setSelectedCity(cities.filter((c) => c !== name)[0] || '');
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function toggleSlot(id, currentActive) {
    const { error } = await supabase
      .from('delivery_slots')
      .update({ active: !currentActive })
      .eq('id', id);
    if (!error) {
      setSlots((prev) => prev.map((s) => s.id === id ? { ...s, active: !currentActive } : s));
    } else {
      showToast('Erro ao atualizar horário.', 'error');
    }
  }

  // Debounce timer ref (per-slot save)
  function updateSlotCapacity(id, rawValue) {
    const val = rawValue === '' ? null : Math.max(1, parseInt(rawValue, 10) || 1);
    // Update local state immediately for responsive UX
    setSlots((prev) => prev.map((s) => s.id === id ? { ...s, max_orders: val } : s));
    // Debounce DB write — 800ms after last keystroke
    clearTimeout(capacityTimersRef.current[id]);
    capacityTimersRef.current[id] = setTimeout(async () => {
      const { error } = await supabase
        .from('delivery_slots')
        .update({ max_orders: val })
        .eq('id', id);
      if (error) showToast('Erro ao salvar capacidade.', 'error');
    }, 800);
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 32, color: '#6b7280' }}>
        <span className="material-symbols-rounded" style={{ fontSize: 22 }}>progress_activity</span>
        Carregando configurações...
      </div>
    );
  }

  const activeCount = neighborhoods.filter((n) => n.active).length;
  const totalCount  = neighborhoods.length;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Configurações da Loja</h1>
      </div>

      {toast && (
        <div style={{
          marginBottom: 20,
          padding: '12px 18px',
          borderRadius: 10,
          background: toast.type === 'error' ? '#fef2f2' : '#f0fdf4',
          color:       toast.type === 'error' ? '#ef4444' : '#16a34a',
          fontWeight: 600,
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <Icon name={toast.type === 'error' ? 'error_outline' : 'check_circle'} size={18} />
          {toast.msg}
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 600 }}>

        {/* ── Horário ── */}
        <div className="admin-card">
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#111', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="schedule" size={20} style={{ color: '#16a34a' }} />
            Horário de Funcionamento
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>Abertura</label>
              <input type="time" className="admin-input" value={openTime} onChange={(e) => setOpenTime(e.target.value)} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>Fechamento</label>
              <input type="time" className="admin-input" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} required />
            </div>
          </div>

          <div style={{
            padding: '10px 14px',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 10,
            fontSize: '0.82rem',
            color: '#15803d',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <Icon name="info" size={15} />
            Aberta das <strong style={{ margin: '0 3px' }}>{openTime}</strong> às <strong style={{ margin: '0 3px' }}>{closeTime}</strong>.
            Fora desse horário um aviso é exibido aos clientes.
          </div>
        </div>

        {/* ── Área de Atuação ── */}
        <div className="admin-card">
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#111', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="map" size={20} style={{ color: '#16a34a' }} />
            Área de Entrega
          </h2>
          <p style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: 14 }}>
            Cidades atendidas. Clientes fora dessas cidades verão um aviso de área não coberta.
          </p>

          {/* Tags das cidades */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {cities.map((city) => (
              <span key={city} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: '#f0fdf4', border: '1px solid #bbf7d0',
                borderRadius: 99, padding: '5px 12px',
                fontSize: '0.82rem', fontWeight: 600, color: '#15803d',
              }}>
                {city}
                <button
                  type="button"
                  onClick={() => removeCity(city)}
                  aria-label={`Remover ${city}`}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', padding: 0,
                    color: '#6b7280',
                  }}
                >
                  <Icon name="close" size={14} />
                </button>
              </span>
            ))}
          </div>

          {/* Adicionar cidade */}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              className="admin-input"
              placeholder="Ex: Catu, Entre Rios..."
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCity(); } }}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="admin-btn-secondary"
              onClick={addCity}
              disabled={!cityInput.trim()}
            >
              <Icon name="add" size={18} />
              Adicionar
            </button>
          </div>
        </div>

        {/* ── Bairros por Cidade ── */}
        <div className="admin-card">
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#111', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="location_city" size={20} style={{ color: '#16a34a' }} />
            Bairros Atendidos
          </h2>
          <p style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: 14 }}>
            Gerencie os bairros de cada cidade. Ative ou desative para controlar quais aparecem no checkout.
          </p>

          {/* City selector tabs */}
          {cities.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              {cities.map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => setSelectedCity(city)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 99,
                    border: selectedCity === city ? '2px solid #16a34a' : '1.5px solid #e2e8f0',
                    background: selectedCity === city ? '#f0fdf4' : '#fff',
                    color: selectedCity === city ? '#15803d' : '#64748b',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {city}
                </button>
              ))}
            </div>
          )}

          {selectedCity && (
            <>
              {/* Actions row */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={handleFetchFromIBGE}
                  disabled={fetchingFromIBGE}
                  style={{ fontSize: '0.8rem' }}
                >
                  {fetchingFromIBGE ? (
                    <><span className="material-symbols-rounded" style={{ fontSize: 16, animation: 'spin 1s linear infinite' }}>progress_activity</span> Buscando...</>
                  ) : (
                    <><Icon name="cloud_download" size={16} /> Importar do IBGE</>
                  )}
                </button>
                <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>
                  {totalCount > 0 && `${activeCount} de ${totalCount} ativos`}
                </span>
              </div>

              {/* Add manual neighborhood */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <input
                  type="text"
                  className="admin-input"
                  placeholder="Adicionar bairro manualmente..."
                  value={newNeighborhood}
                  onChange={(e) => setNewNeighborhood(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddNeighborhood(); } }}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={handleAddNeighborhood}
                  disabled={!newNeighborhood.trim()}
                  style={{ fontSize: '0.8rem' }}
                >
                  <Icon name="add" size={16} />
                </button>
              </div>

              {/* Neighborhood list */}
              {loadingNeigh ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, color: '#9ca3af', fontSize: '0.85rem' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 18, animation: 'spin 1s linear infinite' }}>progress_activity</span>
                  Carregando bairros...
                </div>
              ) : neighborhoods.length === 0 ? (
                <div style={{
                  padding: '20px 16px',
                  textAlign: 'center',
                  color: '#9ca3af',
                  fontSize: '0.85rem',
                  border: '1.5px dashed #e2e8f0',
                  borderRadius: 10,
                }}>
                  <Icon name="add_location_alt" size={28} style={{ color: '#d1d5db', marginBottom: 6 }} />
                  <br />
                  Nenhum bairro cadastrado para <strong>{selectedCity}</strong>.
                  <br />
                  Clique em "Importar do IBGE" ou adicione manualmente.
                </div>
              ) : (
                <div style={{
                  maxHeight: 340,
                  overflowY: 'auto',
                  border: '1.5px solid #f1f5f9',
                  borderRadius: 10,
                }}>
                  {neighborhoods.map((n, i) => (
                    <div
                      key={n.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '9px 14px',
                        borderBottom: i < neighborhoods.length - 1 ? '1px solid #f1f5f9' : 'none',
                        background: n.active ? '#fff' : '#fafafa',
                        transition: 'background 0.15s',
                      }}
                    >
                      {/* Toggle */}
                      <button
                        type="button"
                        onClick={() => toggleNeighborhood(n.id, n.active)}
                        aria-label={n.active ? `Desativar ${n.name}` : `Ativar ${n.name}`}
                        style={{
                          width: 36,
                          height: 20,
                          borderRadius: 99,
                          border: 'none',
                          background: n.active ? '#16a34a' : '#d1d5db',
                          cursor: 'pointer',
                          position: 'relative',
                          flexShrink: 0,
                          transition: 'background 0.2s',
                        }}
                      >
                        <span style={{
                          position: 'absolute',
                          top: 2,
                          left: n.active ? 18 : 2,
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          background: '#fff',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                          transition: 'left 0.2s',
                        }} />
                      </button>

                      {/* Name */}
                      <span style={{
                        flex: 1,
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        color: n.active ? '#1e293b' : '#9ca3af',
                        textDecoration: n.active ? 'none' : 'line-through',
                        transition: 'color 0.2s',
                      }}>
                        {n.name}
                      </span>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDeleteNeighborhood(n.id, n.name)}
                        aria-label={`Excluir ${n.name}`}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#d1d5db',
                          display: 'flex',
                          padding: 2,
                          transition: 'color 0.15s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#d1d5db'}
                      >
                        <Icon name="delete_outline" size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Frete ── */}
        <div className="admin-card">
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#111', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="local_shipping" size={20} style={{ color: '#16a34a' }} />
            Configurações de Frete
          </h2>
          <p style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: 16 }}>
            Configure o valor do frete e a regra de frete grátis.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Valor do frete (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="admin-input"
                value={shippingFee}
                onChange={e => setShippingFee(e.target.value)}
                placeholder="4.00"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Frete grátis acima de (R$)
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 400, marginLeft: 4 }}>0 = desativar</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="admin-input"
                value={freeShippingAbove}
                onChange={e => setFreeShippingAbove(e.target.value)}
                placeholder="0"
                disabled={!freeShippingActive}
                style={{ opacity: freeShippingActive ? 1 : 0.5 }}
              />
            </div>
          </div>

          <label className="admin-toggle-label">
            <span className="admin-toggle-switch">
              <input
                type="checkbox"
                checked={freeShippingActive}
                onChange={e => setFreeShippingActive(e.target.checked)}
              />
              <span className="admin-toggle-thumb" />
            </span>
            <span>
              <strong>Ativar frete grátis</strong>
              <span className="admin-toggle-sub">
                {freeShippingActive && parseFloat(freeShippingAbove) > 0
                  ? `Frete grátis em pedidos acima de R$ ${parseFloat(freeShippingAbove).toFixed(2).replace('.', ',')}`
                  : 'Frete grátis desativado'}
              </span>
            </span>
          </label>
        </div>

        {/* ── Horários de Entrega ── */}
        <div className="admin-card">
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#111', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="schedule" size={20} style={{ color: '#16a34a' }} />
            Horários de Entrega
            <span style={{
              marginLeft: 'auto', fontSize: '0.72rem', fontWeight: 700,
              background: '#f0fdf4', color: '#15803d',
              border: '1px solid #bbf7d0', borderRadius: 99, padding: '2px 10px',
            }}>
              {slots.filter(s => s.active).length}/{slots.length} ativos
            </span>
          </h2>
          <p style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: 16 }}>
            Ative/desative janelas e defina a capacidade máxima de pedidos por faixa. Alterações salvas instantaneamente.
          </p>

          {/* Column headers */}
          {!loadingSlots && slots.length > 0 && (
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 120px 52px',
              gap: 8, paddingBottom: 6, marginBottom: 4,
              borderBottom: '1px solid #f3f4f6',
              fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              <span>Horário</span>
              <span style={{ textAlign: 'center' }}>Máx. pedidos</span>
              <span style={{ textAlign: 'center' }}>Ativo</span>
            </div>
          )}

          {loadingSlots ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0', color: '#94a3b8', fontSize: '0.85rem' }}>
              <span className="material-symbols-rounded" style={{ fontSize: 18, animation: 'spin 1s linear infinite' }}>progress_activity</span>
              Carregando horários...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {slots.map((slot) => (
                <div key={slot.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 120px 52px',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  background: slot.active ? '#f0fdf4' : '#f9fafb',
                  border: `1.5px solid ${slot.active ? '#bbf7d0' : '#e5e7eb'}`,
                  borderRadius: 12,
                  transition: 'all 0.2s',
                }}>
                  {/* Label */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="material-symbols-rounded" style={{
                      fontSize: 16, flexShrink: 0,
                      color: slot.active ? '#16a34a' : '#d1d5db',
                    }}>schedule</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: slot.active ? '#111' : '#9ca3af' }}>
                        {slot.slot_label}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: slot.active ? '#15803d' : '#cbd5e1', fontWeight: 600 }}>
                        {slot.active ? 'Disponível' : 'Desativado'}
                      </div>
                    </div>
                  </div>

                  {/* Capacity input */}
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      min="1"
                      max="999"
                      value={slot.max_orders ?? ''}
                      placeholder="∞"
                      onChange={(e) => updateSlotCapacity(slot.id, e.target.value)}
                      disabled={!slot.active}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        border: '1.5px solid #e5e7eb',
                        borderRadius: 8,
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: '#111',
                        textAlign: 'center',
                        background: slot.active ? '#fff' : '#f3f4f6',
                        opacity: slot.active ? 1 : 0.5,
                        outline: 'none',
                        fontFamily: 'inherit',
                      }}
                      title={slot.active ? 'Máximo de pedidos por dia neste horário. Deixe em branco para ilimitado.' : 'Ative o horário para configurar a capacidade'}
                    />
                  </div>

                  {/* Toggle */}
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <span className="admin-toggle-switch">
                      <input
                        type="checkbox"
                        checked={slot.active}
                        onChange={() => toggleSlot(slot.id, slot.active)}
                      />
                      <span className="admin-toggle-thumb" />
                    </span>
                  </label>
                </div>
              ))}
            </div>
          )}

          {/* Legend */}
          <div style={{ marginTop: 12, fontSize: '0.75rem', color: '#9ca3af', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="info" size={13} />
              <span><strong>Máx. pedidos</strong> em branco = ilimitado. O checkout bloqueia o horário quando a capacidade é atingida.</span>
            </div>
          </div>
        </div>

        {/* ── Origem da Rota ── */}
        <div className="admin-card">
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#111', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="route" size={20} style={{ color: '#7c3aed' }} />
            Origem das Rotas
          </h2>
          <p style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: 16 }}>
            Ponto de partida usado na otimização de rotas. Configure o endereço exacto da loja para que o Google calcule a sequência mais eficiente.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>Cidade da loja</label>
              <input
                type="text"
                className="admin-input"
                value={storeCity}
                onChange={e => setStoreCity(e.target.value)}
                placeholder="Ex: Alagoinhas"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>Endereço completo da loja</label>
              <input
                type="text"
                className="admin-input"
                value={storeAddress}
                onChange={e => setStoreAddress(e.target.value)}
                placeholder="Ex: Rua das Flores, 100, Centro, Alagoinhas, BA"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Latitude
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 400, marginLeft: 4 }}>opcional</span>
                </label>
                <input
                  type="text"
                  className="admin-input"
                  value={storeLat}
                  onChange={e => setStoreLat(e.target.value)}
                  placeholder="Ex: -12.1339"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Longitude
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 400, marginLeft: 4 }}>opcional</span>
                </label>
                <input
                  type="text"
                  className="admin-input"
                  value={storeLng}
                  onChange={e => setStoreLng(e.target.value)}
                  placeholder="Ex: -38.4197"
                />
              </div>
            </div>
            {(!storeLat || !storeLng) && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                background: '#f5f3ff', border: '1px solid #ddd6fe',
                borderRadius: 8, padding: '10px 12px', fontSize: '0.78rem', color: '#5b21b6',
              }}>
                <Icon name="info" size={14} style={{ color: '#7c3aed', flexShrink: 0, marginTop: 1 }} />
                <span>
                  Sem lat/lng, a rota saíra do endereço textual. Para precisão máxima, obtenha as coordenadas em{' '}
                  <a href="https://www.google.com/maps" target="_blank" rel="noreferrer" style={{ color: '#7c3aed', fontWeight: 600 }}>Google Maps</a>{' '}
                  (clique com botão direito → "O que há aqui?").
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Salvar ── */}
        <button type="submit" className="admin-btn-primary" disabled={saving} style={{ alignSelf: 'flex-start' }}>
          {saving ? (
            <><span className="material-symbols-rounded" style={{ fontSize: 18 }}>progress_activity</span> Salvando...</>
          ) : (
            <><Icon name="save" size={18} /> Salvar configurações</>
          )}
        </button>
      </form>
    </div>
  );
}
