/**
 * Executa queries do docs/VERIFICACAO-PROMPT.md via Management API
 */
const PROJECT_REF = 'wjkytzvgbvkcaqjrqsbu';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!TOKEN) {
  console.error('Missing SUPABASE_ACCESS_TOKEN');
  process.exit(1);
}

async function query(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(body));
  return body;
}

const queries = {
  tables: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`,
  rls: `SELECT relname AS table_name, relrowsecurity AS rls_enabled FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' ORDER BY relname`,
  policies: `SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname`,
  routines: `SELECT routine_name, routine_type FROM information_schema.routines WHERE routine_schema = 'public' ORDER BY routine_name`,
  triggers: `SELECT trigger_name, event_object_table, event_manipulation, action_timing FROM information_schema.triggers WHERE trigger_schema = 'public' ORDER BY event_object_table`,
  sequences: `SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'`,
  buckets: `SELECT id, name, public FROM storage.buckets`,
  settings: `SELECT key, value, label FROM public.store_settings ORDER BY key`,
  slots: `SELECT slot_label, slot_start, slot_end, sort_order, active, max_orders FROM public.delivery_slots ORDER BY sort_order`,
  neighborhoods: `SELECT city, name, active FROM public.neighborhoods ORDER BY name`,
  columns: `SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND ((table_name = 'neighborhoods') OR (table_name = 'delivery_slots' AND column_name = 'max_orders') OR (table_name = 'delivery_slot_exceptions' AND column_name IN ('slot_id', 'active_override', 'max_orders_override')) OR (table_name = 'addresses' AND column_name IN ('phone', 'reference')) OR (table_name = 'order_items' AND column_name = 'total_price') OR (table_name = 'profiles' AND column_name IN ('whatsapp', 'cpf', 'promo_emails'))) ORDER BY table_name, column_name`,
};

const results = {};
for (const [key, sql] of Object.entries(queries)) {
  results[key] = await query(sql);
}

console.log(JSON.stringify(results, null, 2));
