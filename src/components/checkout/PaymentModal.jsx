import { useState, useEffect } from 'react';
import Icon from '../ui/Icon';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';
import './PaymentModal.css';

/** Formata segundos restantes: "23h 59min" quando falta ≥ 1h, senão "mm:ss". */
function formatCountdown(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * PaymentModal — pagamento in-app.
 *  - Pix: QR + copia-e-cola, contador de validade e confirmação automática
 *    (faz polling do payment_status do pedido; ao aprovar, mostra sucesso).
 *  - Cartão: iframe do Checkout Pro.
 *
 * pixData carrega os campos do create-mp-preference + enriquecimento do
 * chamador (amount, order_number, order_id).
 */
export default function PaymentModal({ url, pixData, onClose }) {
  const [copied,    setCopied]    = useState(false);
  const [status,    setStatus]    = useState('waiting'); // 'waiting' | 'approved'
  const [expiresAt, setExpiresAt] = useState(null);
  const [now,       setNow]       = useState(() => Date.now());

  const isPix       = Boolean(pixData?.is_direct_pix || pixData?.pix_qr_code);
  const pixCode     = pixData?.pix_qr_code || '';
  const qrBase64    = pixData?.pix_qr_code_base64 || '';
  const amount      = pixData?.amount;
  const orderNumber = pixData?.order_number;
  const orderId     = pixData?.order_id;

  // Confirmação automática: lê payment_status + validade do pedido no banco.
  // Não depende de deploy — a coluna pix_expires_at já é preenchida hoje.
  useEffect(() => {
    if (!isPix || !orderId || status === 'approved') return undefined;
    let cancelled = false;
    const check = async () => {
      const { data } = await supabase
        .from('orders')
        .select('payment_status, pix_expires_at')
        .eq('id', orderId)
        .maybeSingle();
      if (cancelled || !data) return;
      if (data.pix_expires_at) setExpiresAt(new Date(data.pix_expires_at).getTime());
      if (data.payment_status === 'approved') setStatus('approved');
    };
    check();
    const id = setInterval(check, 4000);
    return () => { cancelled = true; clearInterval(id); };
  }, [isPix, orderId, status]);

  // Ticker do contador
  useEffect(() => {
    if (!expiresAt || status === 'approved') return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiresAt, status]);

  // Aprovado → deixa a celebração à mostra e fecha (chamador redireciona)
  useEffect(() => {
    if (status !== 'approved') return undefined;
    const t = setTimeout(() => onClose?.(), 2200);
    return () => clearTimeout(t);
  }, [status, onClose]);

  if (!url && !pixData) return null;

  const handleCopyPix = () => {
    if (!pixCode) return;
    navigator.clipboard?.writeText(pixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const secondsLeft = expiresAt ? Math.max(0, Math.floor((expiresAt - now) / 1000)) : null;
  // Formato amigável: horas quando falta muito (ex.: "23h 59min"); mm:ss só na
  // reta final (< 1h) pra dar sensação de urgência. Sem isso, um Pix de ~24h
  // (padrão do Mercado Pago) apareceria como "1439:53".
  const mmss = secondsLeft != null ? formatCountdown(secondsLeft) : null;
  const expired = secondsLeft === 0;

  /* ── Cartão (Checkout Pro) ── */
  if (!isPix) {
    return (
      <div className="pay-overlay" onClick={onClose}>
        <div className="pay-card" onClick={(e) => e.stopPropagation()}>
          <div className="pay-head">
            <span className="pay-head-title"><Icon name="lock" size={16} /> Pagamento seguro</span>
            <button className="pay-close" onClick={onClose} aria-label="Fechar"><Icon name="close" size={20} /></button>
          </div>
          <iframe src={url} title="Mercado Pago" className="pay-iframe" allow="payment" />
        </div>
      </div>
    );
  }

  /* ── Pix (in-app) ── */
  return (
    <div className="pay-overlay" onClick={status === 'approved' ? undefined : onClose}>
      <div className="pay-card pay-card--pix" onClick={(e) => e.stopPropagation()}>
        {status === 'approved' ? (
          <div className="pay-success">
            <div className="pay-success-badge"><Icon name="check" size={44} /></div>
            <h2 className="pay-success-title">Pagamento aprovado!</h2>
            <p className="pay-success-sub">
              Seu pedido{orderNumber ? ` #${orderNumber}` : ''} já está sendo preparado.
            </p>
          </div>
        ) : (
          <>
            <div className="pay-head">
              <span className="pay-head-title"><Icon name="qr_code_2" size={18} /> Pagar com Pix</span>
              <button className="pay-close" onClick={onClose} aria-label="Fechar"><Icon name="close" size={20} /></button>
            </div>

            <div className="pay-pix-body">
              {amount != null && (
                <div className="pay-amount">
                  <span className="pay-amount-label">
                    Valor a pagar{orderNumber ? ` · Pedido #${orderNumber}` : ''}
                  </span>
                  <span className="pay-amount-value">{formatCurrency(amount)}</span>
                </div>
              )}

              {qrBase64 && (
                <div className="pay-qr">
                  <img src={`data:image/png;base64,${qrBase64}`} alt="QR Code Pix" className="pay-qr-img" />
                  <span className="pay-qr-cap">
                    <Icon name="photo_camera" size={15} /> Aponte a câmera do app do seu banco
                  </span>
                </div>
              )}

              <div className="pay-or"><span>ou copie o código</span></div>

              <button className={`pay-copy ${copied ? 'is-copied' : ''}`} onClick={handleCopyPix}>
                <Icon name={copied ? 'check' : 'content_copy'} size={18} />
                {copied ? 'Código copiado!' : 'Copiar código Pix'}
              </button>
              <p className="pay-code" onClick={handleCopyPix} title="Toque para copiar">{pixCode}</p>

              {mmss && !expired && (
                <div className="pay-timer">
                  <Icon name="schedule" size={14} /> Código válido por <strong>{mmss}</strong>
                </div>
              )}
              {expired && (
                <div className="pay-timer pay-timer--expired">
                  <Icon name="error" size={14} /> Código expirado — refaça o pedido
                </div>
              )}

              <div className="pay-status">
                <span className="pay-status-dot" />
                Aguardando pagamento — confirmamos automaticamente
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
