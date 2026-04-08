import { useState, useEffect, useRef, useCallback } from 'react';
import { useCheckout } from '../../context/CheckoutContext';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import Icon from '../ui/Icon';
import FreeShippingBanner from './FreeShippingBanner';

/* ── Helpers de máscara ── */
function maskPhone(v) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
  }
  return d.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
}

function maskCep(v) {
  const d = v.replace(/\D/g, '').slice(0, 8);
  return d.replace(/^(\d{5})(\d{0,3})/, '$1-$2').replace(/-$/, '');
}

/* ── SVGs ── */
function PinIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
        fill="#22c55e" stroke="#22c55e" strokeWidth="0.5" />
      <circle cx="12" cy="9" r="2.5" fill="white" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

/* ── Edge Function URL base ── */
const EDGE_URL = import.meta.env.VITE_SUPABASE_URL + '/functions/v1';

export default function AddressStep({ onBackToStore }) {
  const { address, setAddress, savedAddress, chooseAddress, nextStep } = useCheckout();
  const { setIsOpen } = useCart();
  const { user } = useAuth();

  // Geolocation state
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError]     = useState('');

  const [savedAddresses, setSavedAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);

  // Autocomplete state (street)
  const [predictions, setPredictions] = useState([]);
  const [loadingAC, setLoadingAC] = useState(false);
  const [showList, setShowList] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  // Neighborhood autocomplete state
  const [allNeighborhoods, setAllNeighborhoods] = useState([]);
  const [neighSuggestions, setNeighSuggestions] = useState([]);
  const [showNeighList, setShowNeighList] = useState(false);
  const neighWrapperRef = useRef(null);

  // Fecha dropdowns ao clicar fora
  useEffect(() => {
    function handler(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowList(false);
      }
      if (neighWrapperRef.current && !neighWrapperRef.current.contains(e.target)) {
        setShowNeighList(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Carrega bairros ativos do banco
  useEffect(() => {
    supabase
      .from('neighborhoods')
      .select('name, city')
      .eq('active', true)
      .order('name')
      .then(({ data }) => {
        setAllNeighborhoods(data || []);
      });
  }, []);

  // Carrega endereços salvos e pré-preenche com o padrão
  useEffect(() => {
    if (!user) return;
    setLoadingAddresses(true);
    supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .then(({ data }) => {
        const list = data || [];
        setSavedAddresses(list);
        setLoadingAddresses(false);

        // Pré-preenche com endereço padrão se o campo ainda estiver vazio
        if (list.length > 0 && !address.street) {
          const def = list[0]; // primeiro = is_default ou mais recente
          setAddress({
            street: `${def.street}${def.number ? ', ' + def.number : ''}${def.complement ? ' — ' + def.complement : ''}`,
            neighborhood: def.neighborhood || '',
            phone: def.phone || '',
            zipCode: maskCep(def.zip || ''),
            reference: def.reference || '',
          });
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  /* ── Street Autocomplete ── */
  const fetchPredictions = useCallback(async (input) => {
    if (!input || input.length < 3) { setPredictions([]); setShowList(false); return; }
    setLoadingAC(true);
    try {
      const res = await fetch(`${EDGE_URL}/places-autocomplete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });
      const json = await res.json();

      if (json.status && json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
        console.error('[Places] Google status:', json.status, json.error_message ?? '');
      }

      const preds = json.predictions || [];
      setPredictions(preds);
      setShowList(preds.length > 0);
    } catch (err) {
      console.error('[Places] fetch error:', err);
      setPredictions([]);
    } finally {
      setLoadingAC(false);
    }
  }, []);

  function handleStreetChange(value) {
    setAddress((prev) => ({ ...prev, street: value }));
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPredictions(value), 400);
  }

  /* ── Selecionar sugestão e buscar detalhes ── */
  async function handleSelectPrediction(pred) {
    setShowList(false);
    setAddress((prev) => ({ ...prev, street: pred.description }));
    setPredictions([]);

    try {
      const res = await fetch(`${EDGE_URL}/place-details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ place_id: pred.place_id }),
      });
      const json = await res.json();
      const comps = json?.result?.address_components || [];

      const get = (types) =>
        comps.find((c) => types.some((t) => c.types.includes(t)))?.long_name || '';

      const streetNumber = get(['street_number']);
      const route = get(['route']);
      const streetFull = route + (streetNumber ? ', ' + streetNumber : '');
      const neighborhood = get(['sublocality_level_1', 'sublocality', 'neighborhood']);
      const zip = maskCep(get(['postal_code']));

      setAddress((prev) => ({
        ...prev,
        street: streetFull || pred.description,
        neighborhood,
        zipCode: zip,
      }));
    } catch {
      // se falhar nos detalhes, mantém a descrição
    }
  }

  /* ── Neighborhood Autocomplete ── */
  function handleNeighborhoodChange(value) {
    setAddress((prev) => ({ ...prev, neighborhood: value }));

    if (!value || value.length < 1) {
      setNeighSuggestions([]);
      setShowNeighList(false);
      return;
    }

    const normalize = (s) =>
      s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const query = normalize(value);

    const filtered = allNeighborhoods
      .filter((n) => normalize(n.name).includes(query))
      .slice(0, 12);

    setNeighSuggestions(filtered);
    setShowNeighList(filtered.length > 0);
  }

  function handleSelectNeighborhood(name) {
    setAddress((prev) => ({ ...prev, neighborhood: name }));
    setShowNeighList(false);
    setNeighSuggestions([]);
  }

  function handleChange(field, value) {
    setAddress((prev) => ({ ...prev, [field]: value }));
  }

  function handlePhoneChange(e) {
    handleChange('phone', maskPhone(e.target.value));
  }

  function handleZipChange(e) {
    handleChange('zipCode', maskCep(e.target.value));
  }

  function handleUseSavedAddress(addr) {
    setAddress({
      street: `${addr.street}${addr.number ? ', ' + addr.number : ''}${addr.complement ? ' — ' + addr.complement : ''}`,
      neighborhood: addr.neighborhood || '',
      phone: addr.phone || '',
      zipCode: maskCep(addr.zip || ''),
      reference: addr.reference || '',
    });
  }

  /* ── Definir como endereço padrão ── */
  async function handleChoose() {
    chooseAddress(); // marca no contexto do checkout

    if (!user || !address.street.trim()) return;

    setSavingAddress(true);
    try {
      // Desmarca outros padrões
      await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', user.id);

      // Verifica se já existe um endereço com mesma rua para o usuário
      const { data: existing } = await supabase
        .from('addresses')
        .select('id')
        .eq('user_id', user.id)
        .ilike('street', address.street.split(',')[0].trim() + '%')
        .maybeSingle();

      const payload = {
        user_id: user.id,
        label: 'Entrega',
        street: address.street.split(',')[0]?.trim() || address.street,
        number: address.street.split(',')[1]?.trim() || '',
        neighborhood: address.neighborhood || '',
        zip: address.zipCode.replace(/\D/g, ''),
        phone: address.phone || '',
        reference: address.reference || '',
        city: '',
        state: '',
        is_default: true,
      };

      if (existing) {
        await supabase.from('addresses').update(payload).eq('id', existing.id);
      } else {
        await supabase.from('addresses').insert(payload);
      }

      // Atualiza lista local
      const { data: updated } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });
      setSavedAddresses(updated || []);
    } catch (err) {
      console.error('[Address] save error:', err);
    } finally {
      setSavingAddress(false);
    }
  }

  function handleAdvance() {
    if (!savedAddress) chooseAddress();
    nextStep();
  }

  const isAddressFilled = address.street.trim().length > 0;

  /** Busca localização atual via Geolocation API + reverse geocoding */
  async function handleGeolocation() {
    if (!navigator.geolocation) {
      setGeoError('Geolocalização não suportada neste navegador.');
      return;
    }
    setGeoLoading(true);
    setGeoError('');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(`${EDGE_URL}/reverse-geocode`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat: latitude, lng: longitude }),
          });
          const json = await res.json();

          if (json.results && json.results.length > 0) {
            const comps = json.results[0].address_components || [];
            const get = (types) =>
              comps.find((c) => types.some((t) => c.types.includes(t)))?.long_name || '';

            const route        = get(['route']);
            const streetNumber = get(['street_number']);
            const neighborhood = get(['sublocality_level_1', 'sublocality', 'neighborhood']);
            const zip          = maskCep(get(['postal_code']));
            const streetFull   = route + (streetNumber ? ', ' + streetNumber : '');

            setAddress((prev) => ({
              ...prev,
              street: streetFull || json.results[0].formatted_address || '',
              neighborhood,
              zipCode: zip,
            }));
          } else {
            setGeoError('Não foi possível identificar o endereço.');
          }
        } catch {
          setGeoError('Erro ao buscar endereço. Tente novamente.');
        } finally {
          setGeoLoading(false);
        }
      },
      (err) => {
        setGeoLoading(false);
        if (err.code === 1) {
          setGeoError('Permissão de localização negada.');
        } else if (err.code === 2) {
          setGeoError('Localização indisponível no momento.');
        } else {
          setGeoError('Tempo esgotado ao buscar localização.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  return (
    <div className="co-address-wrapper">
      {/* Banner frete grátis */}
      <FreeShippingBanner onGoToStore={onBackToStore} />

      {/* Endereços salvos */}
      {!loadingAddresses && savedAddresses.length > 0 && (
        <div className="co-saved-addresses">
          <p className="co-saved-label">Usar um endereço salvo:</p>
          <div className="co-saved-list">
            {savedAddresses.map((addr) => (
              <button
                key={addr.id}
                type="button"
                className="co-saved-addr-btn"
                onClick={() => handleUseSavedAddress(addr)}
              >
                <span className="co-saved-addr-label">{addr.label}</span>
                <span className="co-saved-addr-text">
                  {addr.street}{addr.number ? `, ${addr.number}` : ''} · {addr.neighborhood || addr.city}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Card principal */}
      <div className="co-card" role="main" aria-label="Formulário de endereço de entrega">

        <div className="co-card-header">
          <PinIcon />
          <h1 className="co-card-title">Onde entregamos?</h1>
        </div>

        <form
          className="co-address-form"
          onSubmit={(e) => { e.preventDefault(); handleAdvance(); }}
          noValidate
        >
          {/* Endereço com autocomplete */}
          <div className="co-field-group" ref={wrapperRef} style={{ position: 'relative' }}>
            <label className="co-field-label" htmlFor="co-street">
              Endereço desejado <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="co-street"
                className="co-field-input"
                type="text"
                placeholder="Digite o endereço de entrega"
                value={address.street}
                onChange={(e) => handleStreetChange(e.target.value)}
                onFocus={() => predictions.length > 0 && setShowList(true)}
                autoComplete="off"
                required
              />
              {loadingAC && (
                <span style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  fontSize: 13, color: '#9ca3af',
                }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 18, animation: 'spin 1s linear infinite' }}>
                    progress_activity
                  </span>
                </span>
              )}
            </div>

            {/* Dropdown de sugestões */}
            {showList && (
              <ul style={{
                position: 'absolute', zIndex: 999, top: '100%', left: 0, right: 0,
                background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 12,
                boxShadow: '0 8px 24px rgba(0,0,0,0.10)', marginTop: 4,
                padding: '6px 0', listStyle: 'none',
              }}>
                {predictions.map((pred) => (
                  <li key={pred.place_id}>
                    <button
                      type="button"
                      onClick={() => handleSelectPrediction(pred)}
                      style={{
                        width: '100%', textAlign: 'left', padding: '10px 14px',
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 13, color: '#1e293b', lineHeight: 1.4,
                        display: 'flex', alignItems: 'flex-start', gap: 8,
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f0fdf4'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                    >
                      <span className="material-symbols-rounded"
                        style={{ fontSize: 17, color: '#16a34a', flexShrink: 0, marginTop: 1 }}>
                        location_on
                      </span>
                      <span>
                        <strong style={{ color: '#111' }}>
                          {pred.structured_formatting?.main_text}
                        </strong>
                        <br />
                        <span style={{ color: '#64748b', fontSize: 12 }}>
                          {pred.structured_formatting?.secondary_text}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
                <li style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                  padding: '4px 12px 6px', borderTop: '1px solid #f1f5f9',
                }}>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>Powered by Google</span>
                </li>
              </ul>
            )}
          </div>

          {/* Bairro com autocomplete local */}
          <div className="co-field-group" ref={neighWrapperRef} style={{ position: 'relative' }}>
            <label className="co-field-label" htmlFor="co-neighborhood">Bairro</label>
            <div style={{ position: 'relative' }}>
              <input
                id="co-neighborhood"
                className="co-field-input"
                type="text"
                placeholder="Digite ou selecione o bairro"
                value={address.neighborhood}
                onChange={(e) => handleNeighborhoodChange(e.target.value)}
                onFocus={() => {
                  // Show all active neighborhoods on focus if input is empty or short
                  if (!address.neighborhood || address.neighborhood.length < 1) {
                    const all = allNeighborhoods.slice(0, 15);
                    setNeighSuggestions(all);
                    setShowNeighList(all.length > 0);
                  } else {
                    handleNeighborhoodChange(address.neighborhood);
                  }
                }}
                autoComplete="off"
              />
              {allNeighborhoods.length > 0 && (
                <span style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  color: '#9ca3af', display: 'flex', pointerEvents: 'none',
                }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 18 }}>
                    expand_more
                  </span>
                </span>
              )}
            </div>

            {/* Dropdown de bairros */}
            {showNeighList && neighSuggestions.length > 0 && (
              <ul style={{
                position: 'absolute', zIndex: 999, top: '100%', left: 0, right: 0,
                background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 12,
                boxShadow: '0 8px 24px rgba(0,0,0,0.10)', marginTop: 4,
                padding: '4px 0', listStyle: 'none',
                maxHeight: 220, overflowY: 'auto',
              }}>
                {neighSuggestions.map((n, i) => {
                  // Highlight the matching portion
                  const query = (address.neighborhood || '').toLowerCase();
                  const idx = n.name.toLowerCase().indexOf(query);
                  let rendered;
                  if (query && idx >= 0) {
                    rendered = (
                      <>
                        {n.name.slice(0, idx)}
                        <strong style={{ color: '#16a34a' }}>{n.name.slice(idx, idx + query.length)}</strong>
                        {n.name.slice(idx + query.length)}
                      </>
                    );
                  } else {
                    rendered = n.name;
                  }

                  return (
                    <li key={`${n.city}-${n.name}-${i}`}>
                      <button
                        type="button"
                        onClick={() => handleSelectNeighborhood(n.name)}
                        style={{
                          width: '100%', textAlign: 'left', padding: '9px 14px',
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: 13, color: '#1e293b', lineHeight: 1.4,
                          display: 'flex', alignItems: 'center', gap: 8,
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f0fdf4'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                      >
                        <span className="material-symbols-rounded"
                          style={{ fontSize: 16, color: '#16a34a', flexShrink: 0 }}>
                          location_city
                        </span>
                        <span>{rendered}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Telefone + CEP */}
          <div className="co-field-row">
            <div className="co-field-group">
              <label className="co-field-label" htmlFor="co-phone">Telefone</label>
              <input
                id="co-phone"
                className="co-field-input"
                type="tel"
                placeholder="(00) 00000-0000"
                value={address.phone}
                onChange={handlePhoneChange}
                autoComplete="tel"
                inputMode="tel"
                maxLength={15}
              />
            </div>

            <div className="co-field-group">
              <label className="co-field-label" htmlFor="co-zip">CEP</label>
              <input
                id="co-zip"
                className="co-field-input"
                type="text"
                placeholder="00000-000"
                value={address.zipCode}
                onChange={handleZipChange}
                autoComplete="postal-code"
                inputMode="numeric"
                maxLength={9}
              />
            </div>
          </div>

          {/* Ponto de referência (opcional) */}
          <div className="co-field-group">
            <label className="co-field-label" htmlFor="co-reference">
              Ponto de referência <span style={{ color: '#9ca3af', fontWeight: 400 }}>(opcional)</span>
            </label>
            <input
              id="co-reference"
              className="co-field-input"
              type="text"
              placeholder="Ex: Próximo ao mercado, portão azul..."
              value={address.reference || ''}
              onChange={(e) => handleChange('reference', e.target.value)}
              autoComplete="off"
              maxLength={120}
            />
          </div>

          {/* Botão geolocalização */}
          <button
            type="button"
            className="co-geoloc-btn"
            onClick={handleGeolocation}
            disabled={geoLoading}
          >
            <span className="material-symbols-rounded" style={
              geoLoading ? { animation: 'spin 1s linear infinite' } : undefined
            }>
              {geoLoading ? 'progress_activity' : 'my_location'}
            </span>
            {geoLoading ? 'Buscando...' : 'Usar minha localização atual'}
          </button>

          {geoError && (
            <p style={{
              fontSize: '0.78rem', color: '#dc2626', margin: '-8px 0 12px',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <span className="material-symbols-rounded" style={{ fontSize: 15 }}>error</span>
              {geoError}
            </p>
          )}

          {/* Botão Definir como endereço padrão */}
          <div className="co-choose-row">
            <button
              type="button"
              className="co-choose-btn"
              onClick={handleChoose}
              disabled={!isAddressFilled || savingAddress}
              aria-label="Definir como endereço padrão"
            >
              {savingAddress ? (
                <span className="material-symbols-rounded" style={{ fontSize: 16, animation: 'spin 1s linear infinite' }}>
                  progress_activity
                </span>
              ) : (
                <>
                  {savedAddress && (
                    <span className="co-choose-check" aria-hidden="true">
                      <Icon name="check" size={16} />
                    </span>
                  )}
                  Definir como endereço padrão
                </>
              )}
            </button>
          </div>
        </form>

        {/* Ações inferiores */}
        <div className="co-actions">
          <button
            type="button"
            className="co-back-btn"
            onClick={onBackToStore}
            aria-label="Voltar para a loja"
          >
            <ArrowLeftIcon />
          </button>

          <button
            type="button"
            className="co-advance-btn"
            onClick={handleAdvance}
            disabled={!isAddressFilled}
          >
            Avançar
          </button>
        </div>
      </div>
    </div>
  );
}
