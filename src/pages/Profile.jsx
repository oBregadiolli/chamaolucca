import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate } from '../lib/utils';
import Icon from '../components/ui/Icon';
import '../styles/profile.css';

const NAV_ITEMS = [
  { id: 'info',     label: 'Informações Básicas' },
  { id: 'address',  label: 'Endereço de Entrega' },
  { id: 'orders',   label: 'Meus Pedidos' },
  { id: 'promo',    label: 'E-mails Promocionais' },
  { id: 'password', label: 'Mudar Senha' },
];

/* ── Order status labels ── */
const ORDER_STATUS = {
  received:   { label: 'Recebido',      icon: 'receipt_long',   cls: 'os-received'   },
  preparing:  { label: 'Em Preparação', icon: 'soup_kitchen',   cls: 'os-preparing'  },
  delivering: { label: 'Em Entrega',    icon: 'local_shipping', cls: 'os-delivering' },
  delivered:  { label: 'Entregue',      icon: 'check_circle',   cls: 'os-delivered'  },
  cancelled:  { label: 'Cancelado',     icon: 'block',          cls: 'os-cancelled'  },
};

/* ── Payment status labels ── */
const PAYMENT_STATUS = {
  pending:    { label: 'Aguardando',     icon: 'hourglass_empty', cls: 'ps-pending',    canRetry: true  },
  approved:   { label: 'Aprovado',       icon: 'check_circle',    cls: 'ps-approved',   canRetry: false },
  in_process: { label: 'Processando',    icon: 'sync',            cls: 'ps-processing', canRetry: false },
  rejected:   { label: 'Recusado',       icon: 'cancel',          cls: 'ps-rejected',   canRetry: true  },
  cancelled:  { label: 'Cancelado',      icon: 'block',           cls: 'ps-cancelled',  canRetry: true  },
  refunded:   { label: 'Reembolsado',    icon: 'currency_exchange',cls: 'ps-refunded',  canRetry: false },
};

const PAYMENT_METHODS = {
  pix:         'Pix',
  credit_card: 'Cartão de crédito',
  debit_card:  'Cartão de débito',
  card:        'Cartão',
  cash:        'Dinheiro na entrega',
};

/* ── Helpers ── */
function formatShortDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  });
}

function itemsSummary(items) {
  if (!items || items.length === 0) return 'Sem itens';
  const count = items.reduce((acc, i) => acc + (i.quantity || 1), 0);
  if (count === 1) return '1 item';
  return `${count} itens`;
}

/* ═══════════════════════════════════════════════
   Order Detail Drawer
   ═══════════════════════════════════════════════ */
function OrderDetailDrawer({ order, onClose, onRetry, retrying, retryError }) {
  if (!order) return null;

  const items = order.order_items || [];
  const os = ORDER_STATUS[order.status] || ORDER_STATUS.received;
  const ps = PAYMENT_STATUS[order.payment_status ?? 'pending'] || PAYMENT_STATUS.pending;
  const canRetry = ps.canRetry && order.status !== 'cancelled' && order.payment_status !== 'approved';

  const subtotal = items.reduce((acc, i) => acc + (i.unit_price * i.quantity), 0);
  const shipping = order.shipping ?? 0;

  return (
    <div className="od-overlay" onClick={onClose}>
      <div className="od-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="od-header">
          <div>
            <h2 className="od-title">Pedido #{order.order_number}</h2>
            <p className="od-subtitle">{formatDate(order.delivery_date || order.created_at?.split('T')[0])}</p>
          </div>
          <button className="od-close" onClick={onClose}>
            <Icon name="close" size={22} />
          </button>
        </div>

        {/* Status badges */}
        <div className="od-badges">
          <div className="od-badge-group">
            <span className="od-badge-label">Pedido</span>
            <span className={`od-badge ${os.cls}`}>
              <Icon name={os.icon} size={14} fill /> {os.label}
            </span>
          </div>
          <div className="od-badge-group">
            <span className="od-badge-label">Pagamento</span>
            <span className={`od-badge ${ps.cls}`}>
              <Icon name={ps.icon} size={14} fill /> {ps.label}
            </span>
          </div>
        </div>

        {/* Info rows */}
        <div className="od-info-section">
          <div className="od-info-row">
            <span>Número</span>
            <strong>#{order.order_number ?? order.id?.slice(0, 8).toUpperCase()}</strong>
          </div>
          <div className="od-info-row">
            <span>Data da compra</span>
            <strong>{order.created_at ? new Date(order.created_at).toLocaleDateString('pt-BR') : '—'}</strong>
          </div>
          <div className="od-info-row">
            <span>Pagamento</span>
            <strong>{PAYMENT_METHODS[order.payment_method] || order.payment_method || '—'}</strong>
          </div>
          {order.delivery_address && (
            <div className="od-info-row">
              <span>Endereço</span>
              <strong className="od-info-addr">{order.delivery_address}</strong>
            </div>
          )}
          {order.delivery_reference && (
            <div className="od-info-row">
              <span>Referência</span>
              <strong className="od-info-addr">{order.delivery_reference}</strong>
            </div>
          )}
          {order.delivery_mode && (
            <div className="od-info-row">
              <span>Modo</span>
              <strong>{order.delivery_mode === 'express' ? '⚡ Entrega Rápida' : '📅 Programada'}</strong>
            </div>
          )}
          {order.delivery_date && (
            <div className="od-info-row">
              <span>Data de entrega</span>
              <strong>{formatDate(order.delivery_date)}</strong>
            </div>
          )}
          {order.delivery_time && order.delivery_time !== 'express' && (
            <div className="od-info-row">
              <span>Horário</span>
              <strong>{order.delivery_time.replace('-', ' às ')}</strong>
            </div>
          )}
          {order.notes && (
            <div className="od-info-row">
              <span>Observações</span>
              <strong className="od-info-addr">{order.notes}</strong>
            </div>
          )}
        </div>

        {/* Items */}
        {items.length > 0 && (
          <div className="od-items-section">
            <p className="od-section-title">Itens do pedido</p>
            {items.map((item) => (
              <div key={item.id} className="od-item-row">
                <div className="od-item-info">
                  <span className="od-item-name">{item.product_name}</span>
                  <span className="od-item-qty">×{item.quantity}</span>
                </div>
                <span className="od-item-price">{formatCurrency(item.unit_price * item.quantity)}</span>
              </div>
            ))}

            <div className="od-totals">
              <div className="od-total-row">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {shipping > 0 && (
                <div className="od-total-row">
                  <span>Frete</span>
                  <span>{formatCurrency(shipping)}</span>
                </div>
              )}
              <div className="od-total-row od-total-final">
                <span>Total</span>
                <strong>{formatCurrency(order.total)}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="od-actions">
          {canRetry && order.payment_provider === 'mercadopago' && (
            <>
              <button
                className="od-btn-retry"
                onClick={onRetry}
                disabled={retrying}
              >
                {retrying ? (
                  <>
                    <div className="od-spinner" />
                    Abrindo Mercado Pago…
                  </>
                ) : (
                  <>
                    <Icon name="refresh" size={18} />
                    Tentar pagamento novamente
                  </>
                )}
              </button>
              {retryError && (
                <div className="od-retry-error">
                  <Icon name="warning" size={16} />
                  {retryError}
                </div>
              )}
            </>
          )}

          <button className="od-btn-view" onClick={() => window.location.href = `/pedido/${order.id}`}>
            <Icon name="visibility" size={18} />
            Ver acompanhamento completo
          </button>

          <button className="od-btn-store" onClick={() => window.location.href = '/loja'}>
            <Icon name="storefront" size={18} />
            Voltar para a loja
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Profile Page
   ═══════════════════════════════════════════════ */
export default function Profile() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  /* ── data ── */
  const [orders, setOrders]       = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState(null);

  /* ── order detail drawer ── */
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [retrying, setRetrying]   = useState(false);
  const [retryError, setRetryError] = useState(null);

  /* ── profile form ── */
  const [name,      setName]      = useState('');
  const [cpf,       setCpf]       = useState('');
  const [whatsapp,  setWhatsapp]  = useState('');
  const [promoOn,   setPromoOn]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [toast,     setToast]     = useState(null);

  /* ── password form ── */
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew,     setPwNew]     = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwSaving,  setPwSaving]  = useState(false);

  /* ── address modal ── */
  const [addrModal, setAddrModal]   = useState(false);
  const [addrForm,  setAddrForm]    = useState({ label:'Casa', street:'', number:'', complement:'', neighborhood:'', city:'', state:'BA', zip:'' });
  const [addrSaving, setAddrSaving] = useState(false);

  /* ── section refs for scrollspy ── */
  const sectionRefs = useRef({});
  const [activeNav, setActiveNav] = useState('info');

  /* redirect if not logged in */
  useEffect(() => {
    if (user === null) navigate('/');
  }, [user, navigate]);

  /* populate form when profile loads */
  useEffect(() => {
    if (profile) {
      setName(profile.name  || '');
      setCpf(profile.cpf    || '');
      setWhatsapp(profile.whatsapp || '');
      setPromoOn(profile.promo_emails || false);
    }
  }, [profile]);

  /* fetch orders and addresses */
  const loadOrders = useCallback(async () => {
    if (!user) return;
    setLoadingOrders(true);
    setOrdersError(null);
    try {
      const [ordRes, addrRes] = await Promise.all([
        supabase.from('orders').select('*, order_items(*)').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('addresses').select('*').eq('user_id', user.id).order('is_default', { ascending: false }),
      ]);
      if (ordRes.error) throw ordRes.error;
      setOrders(ordRes.data || []);
      setAddresses(addrRes.data || []);
    } catch {
      setOrdersError('Erro ao carregar pedidos. Tente novamente.');
    } finally {
      setLoadingOrders(false);
    }
  }, [user]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  /* scrollspy */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActiveNav(e.target.id);
        });
      },
      { rootMargin: '-30% 0px -60% 0px' }
    );
    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  function scrollTo(id) {
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveNav(id);
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  /* ── Save profile ── */
  async function handleSaveProfile(e) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ name, cpf, whatsapp, promo_emails: promoOn }).eq('id', user.id);
    setSaving(false);
    if (error) showToast('Erro ao salvar. Tente novamente.', 'error');
    else showToast('Dados salvos com sucesso!');
  }

  /* ── Change password ── */
  async function handleChangePassword(e) {
    e.preventDefault();
    if (pwNew !== pwConfirm) return showToast('As senhas não coincidem.', 'error');
    if (pwNew.length < 6) return showToast('A senha deve ter pelo menos 6 caracteres.', 'error');
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pwNew });
    setPwSaving(false);
    if (error) showToast('Erro ao alterar senha.', 'error');
    else {
      showToast('Senha alterada com sucesso!');
      setPwCurrent(''); setPwNew(''); setPwConfirm('');
    }
  }

  /* ── Save address ── */
  async function handleSaveAddress(e) {
    e.preventDefault();
    if (!addrForm.street || !addrForm.city) return;
    setAddrSaving(true);
    const { data, error } = await supabase.from('addresses').insert({ ...addrForm, user_id: user.id }).select().single();
    setAddrSaving(false);
    if (!error && data) {
      setAddresses((prev) => [...prev, data]);
      setAddrModal(false);
      setAddrForm({ label:'Casa', street:'', number:'', complement:'', neighborhood:'', city:'', state:'BA', zip:'' });
      showToast('Endereço adicionado!');
    }
  }

  /* ── Remove address ── */
  async function handleRemoveAddress(id) {
    await supabase.from('addresses').delete().eq('id', id);
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  }

  /* ── Retry payment from drawer ── */
  async function handleRetryPayment() {
    if (!selectedOrder || retrying) return;
    setRetrying(true);
    setRetryError(null);

    try {
      const appUrl = window.location.origin;
      const items = (selectedOrder.order_items || []).map((i) => ({
        title:      i.product_name,
        quantity:   i.quantity,
        unit_price: i.unit_price,
      }));

      const { data, error: fnErr } = await supabase.functions.invoke('create-mp-preference', {
        body: {
          order_id:     selectedOrder.id,
          order_number: selectedOrder.order_number,
          items,
          payer_email:  user.email ?? `${user.id}@chamaolucca.com`,
          payer_name:   'Cliente',
          shipping:     selectedOrder.shipping ?? 0,
          app_url:      appUrl,
        },
      });

      if (fnErr) throw new Error(`Erro de conexão: ${fnErr.message}`);
      if (!data?.ok) throw new Error(data?.error ?? 'Erro no servidor de pagamento.');

      window.location.href = data.checkout_url;
    } catch (err) {
      setRetryError(err.message || 'Não foi possível abrir o pagamento. Tente novamente.');
      setRetrying(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  const displayName = profile?.name || user?.email?.split('@')[0] || 'Você';

  return (
    <>
      <div className="profile-page">
        {/* ── Sidebar ── */}
        <nav className="profile-sidebar">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`profile-nav-item${activeNav === item.id ? ' active' : ''}`}
              onClick={() => scrollTo(item.id)}
            >
              {item.label}
            </button>
          ))}
          <button className="profile-nav-item danger" onClick={handleSignOut}>
            Finalizar sessão
          </button>
        </nav>

        {/* ── Content ── */}
        <div className="profile-content">
          {/* Greeting */}
          <div className="profile-greeting">
            <div className="profile-avatar">
              <Icon name="person" size={32} fill style={{ color: '#6b7280' }} />
            </div>
            <div className="profile-greeting-text">
              <h2>Olá, {displayName}</h2>
              <p>Sempre bom te ver aqui ッ</p>
            </div>
          </div>

          {toast && (
            <div className={`profile-toast${toast.type === 'error' ? ' error' : ''}`}>
              {toast.msg}
            </div>
          )}

          {/* ── Dados Pessoais ── */}
          <section id="info" ref={(el) => (sectionRefs.current.info = el)} className="profile-section">
            <h2 className="profile-section-title">Dados Pessoais</h2>
            <form onSubmit={handleSaveProfile}>
              <div className="profile-form-row">
                <label className="profile-form-label">Nome</label>
                <input className="profile-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome completo" />
              </div>
              <div className="profile-form-row">
                <label className="profile-form-label highlight">CPF</label>
                <input className="profile-input" value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="Seu cpf" />
              </div>
              <div className="profile-form-row">
                <label className="profile-form-label">WhatsApp</label>
                <input className="profile-input" type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="Seu contato" />
              </div>
              <div className="profile-form-row">
                <label className="profile-form-label">Email</label>
                <input className="profile-input" value={user?.email || ''} disabled />
              </div>
              <div className="profile-btn-row">
                <button type="submit" className="btn-profile-save" disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </section>

          <hr className="profile-divider" />

          {/* ── Endereços ── */}
          <section id="address" ref={(el) => (sectionRefs.current.address = el)} className="profile-section">
            <h2 className="profile-section-title">Endereços</h2>

            {addresses.length === 0 ? (
              <div className="profile-empty-box">
                <span className="profile-empty-label">Nenhum endereço cadastrado</span>
                <button className="btn-profile-new-addr" onClick={() => setAddrModal(true)}>
                  Novo Endereço
                </button>
              </div>
            ) : (
              <>
                {addresses.map((addr) => (
                  <div key={addr.id} className="address-card">
                    <div className="address-card-label">
                      {addr.label}{addr.is_default ? ' · Padrão' : ''}
                    </div>
                    <div className="address-card-text">
                      {addr.street}{addr.number ? `, ${addr.number}` : ''}
                      {addr.complement ? ` — ${addr.complement}` : ''}<br />
                      {addr.neighborhood ? `${addr.neighborhood}, ` : ''}{addr.city} — {addr.state}
                      {addr.zip ? ` · CEP ${addr.zip}` : ''}
                    </div>
                    <div className="address-card-actions">
                      <button className="address-action-btn address-action-remove" onClick={() => handleRemoveAddress(addr.id)}>
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
                <button className="btn-profile-new-addr" style={{ marginTop: 8 }} onClick={() => setAddrModal(true)}>
                  + Novo Endereço
                </button>
              </>
            )}
          </section>

          <hr className="profile-divider" />

          {/* ── Pedidos ── */}
          <section id="orders" ref={(el) => (sectionRefs.current.orders = el)} className="profile-section">
            <h2 className="profile-section-title">Meus Pedidos</h2>

            {loadingOrders ? (
              <div className="oh-loading">
                <div className="spinner" />
                <p>Carregando pedidos...</p>
              </div>
            ) : ordersError ? (
              <div className="oh-error">
                <Icon name="error_outline" size={28} />
                <p>{ordersError}</p>
                <button className="oh-retry-btn" onClick={loadOrders}>
                  <Icon name="refresh" size={16} /> Tentar novamente
                </button>
              </div>
            ) : orders.length === 0 ? (
              <div className="oh-empty">
                <div className="oh-empty-icon">
                  <Icon name="receipt_long" size={36} />
                </div>
                <h3>Nenhum pedido ainda</h3>
                <p>Seus pedidos aparecerão aqui assim que você fizer sua primeira compra.</p>
                <button className="oh-shop-btn" onClick={() => navigate('/loja')}>
                  <Icon name="storefront" size={18} /> Ir para a loja
                </button>
              </div>
            ) : (
              <div className="oh-list">
                {orders.map((order) => {
                  const os = ORDER_STATUS[order.status] || ORDER_STATUS.received;
                  const ps = PAYMENT_STATUS[order.payment_status ?? 'pending'] || PAYMENT_STATUS.pending;
                  const items = order.order_items || [];

                  return (
                    <button
                      key={order.id}
                      className="oh-card"
                      onClick={() => { setSelectedOrder(order); setRetrying(false); setRetryError(null); }}
                    >
                      {/* Top row: number + date */}
                      <div className="oh-card-top">
                        <span className="oh-card-number">#{order.order_number}</span>
                        <span className="oh-card-date">{formatShortDate(order.delivery_date || order.created_at?.split('T')[0])}</span>
                      </div>

                      {/* Middle: items summary + total */}
                      <div className="oh-card-middle">
                        <span className="oh-card-items">
                          <Icon name="shopping_bag" size={14} />
                          {itemsSummary(items)}
                        </span>
                        <span className="oh-card-total">{formatCurrency(order.total)}</span>
                      </div>

                      {/* Bottom: badges */}
                      <div className="oh-card-bottom">
                        <span className={`oh-badge ${os.cls}`}>
                          <Icon name={os.icon} size={13} fill /> {os.label}
                        </span>
                        <span className={`oh-badge ${ps.cls}`}>
                          <Icon name={ps.icon} size={13} fill /> {ps.label}
                        </span>
                      </div>

                      {/* Arrow */}
                      <div className="oh-card-arrow">
                        <Icon name="chevron_right" size={20} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <hr className="profile-divider" />

          {/* ── Mensagem Promocional ── */}
          <section id="promo" ref={(el) => (sectionRefs.current.promo = el)} className="profile-section">
            <h2 className="profile-section-title">Mensagem Promocional</h2>
            <div className="promo-toggle-row">
              <label className="toggle-switch">
                <input type="checkbox" checked={promoOn} onChange={(e) => { setPromoOn(e.target.checked); }} />
                <span className="toggle-track" />
              </label>
              <span className="promo-label">Receber promoções</span>
            </div>
            <p className="promo-description">
              Eventualmente, podemos enviar por <a href="#">email</a> e pelo{' '}
              <a href="#">whatsapp</a> com promoções ou avisos em geral. Deseja recebê-los?
            </p>
            <div className="profile-btn-row" style={{ marginTop: 16 }}>
              <button className="btn-profile-save" onClick={handleSaveProfile} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar preferência'}
              </button>
            </div>
          </section>

          <hr className="profile-divider" />

          {/* ── Mudar Senha ── */}
          <section id="password" ref={(el) => (sectionRefs.current.password = el)} className="profile-section">
            <h2 className="profile-section-title">Mudar Senha</h2>
            <form onSubmit={handleChangePassword}>
              <div className="profile-form-row">
                <input className="profile-input" type="password" value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)} placeholder="Senha Atual" />
              </div>
              <div className="profile-form-row">
                <input className="profile-input" type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)} placeholder="Nova Senha" minLength={6} />
              </div>
              <div className="profile-form-row">
                <input className="profile-input" type="password" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} placeholder="Confirmar Nova Senha" minLength={6} />
              </div>
              <div className="profile-btn-row">
                <button type="submit" className="btn-change-password" disabled={pwSaving}>
                  <Icon name="lock" size={18} /> {pwSaving ? 'Alterando...' : 'Alterar Senha'}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>

      {/* ── Address Modal ── */}
      {addrModal && (
        <div className="modal-overlay" onClick={() => setAddrModal(false)}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Novo Endereço</h2>
              <button className="modal-close" onClick={() => setAddrModal(false)}>
                <Icon name="close" size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveAddress}>
              <div className="addr-modal-body">
                <div className="profile-form-row">
                  <label className="profile-form-label">Rótulo</label>
                  <input className="profile-input" value={addrForm.label} onChange={(e) => setAddrForm({ ...addrForm, label: e.target.value })} placeholder="Ex: Casa, Trabalho" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 10 }}>
                  <div className="profile-form-row">
                    <label className="profile-form-label">Rua</label>
                    <input className="profile-input" required value={addrForm.street} onChange={(e) => setAddrForm({ ...addrForm, street: e.target.value })} placeholder="Nome da rua" />
                  </div>
                  <div className="profile-form-row">
                    <label className="profile-form-label">Número</label>
                    <input className="profile-input" value={addrForm.number} onChange={(e) => setAddrForm({ ...addrForm, number: e.target.value })} placeholder="Nº" />
                  </div>
                </div>
                <div className="profile-form-row">
                  <label className="profile-form-label">Complemento</label>
                  <input className="profile-input" value={addrForm.complement} onChange={(e) => setAddrForm({ ...addrForm, complement: e.target.value })} placeholder="Apto, bloco..." />
                </div>
                <div className="profile-form-row">
                  <label className="profile-form-label">Bairro</label>
                  <input className="profile-input" value={addrForm.neighborhood} onChange={(e) => setAddrForm({ ...addrForm, neighborhood: e.target.value })} placeholder="Seu bairro" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 10 }}>
                  <div className="profile-form-row">
                    <label className="profile-form-label">Cidade</label>
                    <input className="profile-input" required value={addrForm.city} onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })} placeholder="Cidade" />
                  </div>
                  <div className="profile-form-row">
                    <label className="profile-form-label">Estado</label>
                    <input className="profile-input" maxLength={2} value={addrForm.state} onChange={(e) => setAddrForm({ ...addrForm, state: e.target.value.toUpperCase() })} placeholder="UF" />
                  </div>
                </div>
                <div className="profile-form-row">
                  <label className="profile-form-label">CEP</label>
                  <input className="profile-input" value={addrForm.zip} onChange={(e) => setAddrForm({ ...addrForm, zip: e.target.value })} placeholder="00000-000" />
                </div>
                <button type="submit" className="btn-profile-save btn-block" style={{ width: '100%', borderRadius: 10 }} disabled={addrSaving}>
                  {addrSaving ? 'Salvando...' : 'Salvar Endereço'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Order Detail Drawer ── */}
      {selectedOrder && (
        <OrderDetailDrawer
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onRetry={handleRetryPayment}
          retrying={retrying}
          retryError={retryError}
        />
      )}
    </>
  );
}
