import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { verifyMpWebhookSignature } from '../_shared/mpSignature.ts';
import { getServiceClient } from '../_shared/supabaseAdmin.ts';

const MP_PAYMENTS_API = 'https://api.mercadopago.com/v1/payments';
const MP_MERCHANT_ORDERS_API = 'https://api.mercadopago.com/merchant_orders';

type MpPayment = {
  id: number | string;
  status?: string;
  external_reference?: string;
  date_approved?: string;
};

function mapMpStatus(status: string | undefined): string {
  switch (status) {
    case 'approved':
      return 'approved';
    case 'rejected':
    case 'cancelled':
      return 'rejected';
    case 'refunded':
    case 'charged_back':
      return 'refunded';
    default:
      return 'pending';
  }
}

async function fetchPayment(token: string, paymentId: string): Promise<MpPayment | null> {
  const res = await fetch(`${MP_PAYMENTS_API}/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    console.error('[mp-webhook] payment fetch failed', paymentId, res.status);
    return null;
  }
  return await res.json();
}

async function resolvePaymentFromMerchantOrder(
  token: string,
  merchantOrderId: string,
): Promise<MpPayment | null> {
  const res = await fetch(`${MP_MERCHANT_ORDERS_API}/${merchantOrderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    console.error('[mp-webhook] merchant_order fetch failed', merchantOrderId, res.status);
    return null;
  }

  const order = await res.json();
  const payments = order?.payments;
  if (!Array.isArray(payments) || payments.length === 0) return null;

  const approved = payments.find((p: { status?: string }) => p.status === 'approved');
  const latest = approved ?? payments[payments.length - 1];
  const paymentId = latest?.id;
  if (!paymentId) return null;

  return fetchPayment(token, String(paymentId));
}

async function updateOrderFromPayment(payment: MpPayment) {
  const orderId = payment.external_reference;
  if (!orderId) {
    console.warn('[mp-webhook] payment without external_reference', payment.id);
    return { ok: false, reason: 'no external_reference' };
  }

  const paymentStatus = mapMpStatus(payment.status);
  const supabase = getServiceClient();

  const updates: Record<string, unknown> = {
    payment_status: paymentStatus,
    payment_id: String(payment.id),
    payment_provider: 'mercadopago',
    updated_at: new Date().toISOString(),
  };

  if (paymentStatus === 'approved') {
    updates.paid_at = payment.date_approved ?? new Date().toISOString();
  }

  const { error } = await supabase.from('orders').update(updates).eq('id', orderId);
  if (error) {
    console.error('[mp-webhook] order update failed', orderId, error.message);
    throw error;
  }

  return { ok: true, order_id: orderId, payment_status: paymentStatus };
}

function extractDataId(url: URL, body: Record<string, unknown> | null): string | null {
  let id = url.searchParams.get('id') || url.searchParams.get('data.id');
  if (!id && body) {
    const data = body.data as { id?: string | number } | undefined;
    id = data?.id != null ? String(data.id) : (body.id != null ? String(body.id) : null);
  }
  return id ? String(id) : null;
}

function parseNotification(
  url: URL,
  body: Record<string, unknown> | null,
): { topic: string | null; id: string | null } {
  let topic = url.searchParams.get('topic') || url.searchParams.get('type');
  let id = extractDataId(url, body);

  if (body) {
    topic = topic || (body.type as string) || (body.topic as string) || (body.action as string) || null;
    if (!id) {
      const data = body.data as { id?: string | number } | undefined;
      id = data?.id != null ? String(data.id) : (body.id != null ? String(body.id) : null);
    }
  }

  return { topic, id: id ? String(id) : null };
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  if (req.method !== 'GET' && req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed' }, 405, req);
  }

  try {
    const token = Deno.env.get('MP_ACCESS_TOKEN');
    if (!token) {
      return jsonResponse({ ok: false, error: 'MP_ACCESS_TOKEN não configurado' }, 500, req);
    }

    const url = new URL(req.url);
    const rawBody = req.method === 'POST' ? await req.text() : '';
    let body: Record<string, unknown> | null = null;

    if (rawBody) {
      try {
        body = JSON.parse(rawBody) as Record<string, unknown>;
      } catch {
        body = null;
      }
    }

    const dataId = extractDataId(url, body);

    if (req.method === 'POST' && rawBody) {
      const sig = await verifyMpWebhookSignature(req, rawBody, dataId);
      if (!sig.ok) {
        console.warn('[mp-webhook] signature rejected:', sig.reason);
        return jsonResponse({ ok: false, error: 'Invalid signature' }, 401, req);
      }
    }

    const { topic, id } = parseNotification(url, body);

    if (!id) {
      return jsonResponse({ ok: true, message: 'notification received (no id)' }, 200, req);
    }

    let payment: MpPayment | null = null;

    if (topic === 'merchant_order') {
      payment = await resolvePaymentFromMerchantOrder(token, id);
    } else {
      payment = await fetchPayment(token, id);
    }

    if (!payment) {
      console.warn('[mp-webhook] payment not found, acknowledging', id, topic);
      return jsonResponse({ ok: true, acknowledged: true, skipped: true, payment_id: id }, 200, req);
    }

    const result = await updateOrderFromPayment(payment);
    if (result.ok === false) {
      return jsonResponse({ ok: true, acknowledged: true, ...result }, 200, req);
    }
    return jsonResponse(result, 200, req);
  } catch (err) {
    console.error('[mp-webhook]', err);
    return jsonResponse({ ok: false, error: String(err) }, 500, req);
  }
});
