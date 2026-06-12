/**
 * Mercado Pago webhook signature validation (x-signature header).
 * @see https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
 */

function parseSignatureHeader(header: string | null): { ts: string; v1: string } | null {
  if (!header) return null;
  const parts = Object.fromEntries(
    header.split(',').map((p) => {
      const [k, ...rest] = p.trim().split('=');
      return [k, rest.join('=')];
    }),
  );
  if (!parts.ts || !parts.v1) return null;
  return { ts: parts.ts, v1: parts.v1 };
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyMpWebhookSignature(
  req: Request,
  rawBody: string,
  dataId: string | null,
): Promise<{ ok: boolean; reason?: string }> {
  const secret = Deno.env.get('MP_WEBHOOK_SECRET');
  if (!secret) {
    console.warn('[mp-webhook] MP_WEBHOOK_SECRET not set — skipping signature check');
    return { ok: true };
  }

  const xSignature = req.headers.get('x-signature');
  const xRequestId = req.headers.get('x-request-id') ?? '';

  const parsed = parseSignatureHeader(xSignature);
  if (!parsed) {
    return { ok: false, reason: 'missing or invalid x-signature' };
  }

  const id = dataId ?? '';
  const manifest = `id:${id};request-id:${xRequestId};ts:${parsed.ts};`;
  const expected = await hmacSha256Hex(secret, manifest);

  if (expected !== parsed.v1) {
    return { ok: false, reason: 'signature mismatch' };
  }

  return { ok: true };
}
