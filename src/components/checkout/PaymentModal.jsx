import React, { useState } from 'react';
import Icon from '../ui/Icon';
import './PaymentModal.css';

export default function PaymentModal({ url, pixData, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!url && !pixData) return null;

  const isPix = pixData?.is_direct_pix || pixData?.pix_qr_code;
  const pixCode = pixData?.pix_qr_code || '';
  const qrBase64 = pixData?.pix_qr_code_base64 || '';

  const handleCopyPix = () => {
    if (!pixCode) return;
    navigator.clipboard.writeText(pixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="payment-modal-overlay">
      <div className="payment-modal-container">
        <div className="payment-modal-header">
          <div className="payment-modal-title">
            <Icon name="lock" size={18} />
            <span>{isPix ? 'Pagamento Instantâneo via Pix' : 'Pagamento Seguro - Mercado Pago'}</span>
          </div>
          <button className="payment-modal-close" onClick={onClose} aria-label="Fechar">
            <Icon name="close" size={20} />
          </button>
        </div>

        <div className="payment-modal-body">
          {isPix ? (
            <div className="pix-modal-content">
              <div className="pix-badge">
                <Icon name="qr_code_2" size={24} />
                <span>Pix Aprovação Imediata</span>
              </div>

              {qrBase64 ? (
                <div className="pix-qr-container">
                  <img
                    src={`data:image/png;base64,${qrBase64}`}
                    alt="QR Code Pix"
                    className="pix-qr-img"
                  />
                </div>
              ) : null}

              <div className="pix-instructions">
                <p>1. Abra o aplicativo do seu banco (Nubank, Itaú, etc.)</p>
                <p>2. Escolha a opção <strong>Pix Copia e Cola</strong></p>
                <p>3. Cole o código abaixo para finalizar:</p>
              </div>

              <div className="pix-code-box">
                <input
                  type="text"
                  readOnly
                  value={pixCode}
                  className="pix-code-input"
                  onClick={handleCopyPix}
                />
              </div>

              <button
                className={`pix-copy-btn ${copied ? 'copied' : ''}`}
                onClick={handleCopyPix}
              >
                <Icon name={copied ? 'check' : 'content_copy'} size={18} />
                {copied ? 'Código Pix Copiado!' : 'Copiar Código Pix'}
              </button>

              <div className="pix-auto-status">
                <div className="pix-pulse-dot" />
                <span>Aguardando confirmação do banco...</span>
              </div>
            </div>
          ) : (
            <iframe
              src={url}
              title="Mercado Pago Checkout"
              className="payment-modal-iframe"
              allow="payment"
            />
          )}
        </div>
      </div>
    </div>
  );
}
