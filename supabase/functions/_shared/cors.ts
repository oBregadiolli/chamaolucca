const DEFAULT_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
];

function parseAllowedOrigins(): string[] {
  const env = Deno.env.get('ALLOWED_ORIGINS');
  const fromEnv = env?.trim()
    ? env.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  // localhost SEMPRE liberado: dev nunca é uma origem de cliente real, e sem
  // isto o app rodando em localhost fica bloqueado por CORS quando ALLOWED_ORIGINS
  // está setada em produção (não incluía as origens de dev). Prod continua vindo
  // da env, então o fallback ([0]) segue sendo a origem de produção.
  return [...new Set([...fromEnv, ...DEFAULT_ORIGINS])];
}

function isOriginAllowed(origin: string): boolean {
  if (!origin) return true;

  const allowed = parseAllowedOrigins();

  for (const entry of allowed) {
    if (entry === origin) return true;
    if (entry === '*.netlify.app' && origin.endsWith('.netlify.app')) return true;
    if (entry.startsWith('https://') && entry.endsWith('/*')) {
      const prefix = entry.slice(0, -1);
      if (origin.startsWith(prefix)) return true;
    }
  }

  return false;
}

export function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const allowOrigin = isOriginAllowed(origin) && origin
    ? origin
    : parseAllowedOrigins()[0] ?? DEFAULT_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-signature, x-request-id',
    'Vary': 'Origin',
  };
}

export function jsonResponse(body: unknown, status = 200, req?: Request): Response {
  const headers = req
    ? corsHeadersFor(req)
    : {
        'Access-Control-Allow-Origin': DEFAULT_ORIGINS[0],
        'Access-Control-Allow-Headers':
          'authorization, x-client-info, apikey, content-type, x-signature, x-request-id',
      };

  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

export function handleOptions(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeadersFor(req) });
  }
  return null;
}
