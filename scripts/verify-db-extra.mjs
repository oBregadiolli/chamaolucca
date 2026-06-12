const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = 'wjkytzvgbvkcaqjrqsbu';
async function q(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  return r.json();
}
const fn = await q("SELECT routine_name FROM information_schema.routines WHERE routine_schema='public' AND routine_name='set_order_number'");
const trg = await q("SELECT trigger_name, event_object_table, trigger_schema FROM information_schema.triggers WHERE trigger_name IN ('trg_set_order_number','on_auth_user_created')");
const authTrg = await q("SELECT tgname, n.nspname AS schema, c.relname AS table FROM pg_trigger t JOIN pg_class c ON t.tgrelid=c.oid JOIN pg_namespace n ON c.relnamespace=n.oid WHERE NOT t.tgisinternal AND tgname IN ('on_auth_user_created','trg_set_order_number')");
const slotCount = await q('SELECT COUNT(*)::int AS total, COUNT(DISTINCT (slot_start, slot_end, sort_order))::int AS unique_slots FROM public.delivery_slots');
console.log(JSON.stringify({ set_order_number: fn, triggers: trg, pg_triggers: authTrg, slot_dup: slotCount }, null, 2));
