import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabaseAdmin.ts';

async function findMunicipioId(cityName: string): Promise<number | null> {
  const url = `https://servicodados.ibge.gov.br/api/v1/localidades/municipios?nome=${encodeURIComponent(cityName)}`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const list = await res.json();
  if (!Array.isArray(list) || list.length === 0) return null;

  const inBA = list.find(
    (m: { microrregiao?: { mesorregiao?: { UF?: { sigla?: string } } } }) =>
      m.microrregiao?.mesorregiao?.UF?.sigla === 'BA',
  );
  return (inBA ?? list[0]).id as number;
}

async function fetchIbgeNeighborhoodNames(municipioId: number): Promise<string[]> {
  const res = await fetch(
    `https://servicodados.ibge.gov.br/api/v1/localidades/municipios/${municipioId}/subdistritos`,
  );
  if (!res.ok) return [];

  const subdistritos = await res.json();
  if (!Array.isArray(subdistritos)) return [];

  const names = subdistritos
    .map((s: { nome?: string }) => s.nome?.trim())
    .filter((n: string | undefined): n is string => Boolean(n));

  return [...new Set(names)].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const { city } = await req.json();
    if (!city) {
      return jsonResponse({ ok: false, error: 'city é obrigatório' }, 400, req);
    }

    const municipioId = await findMunicipioId(String(city));
    let names: string[] = [];

    if (municipioId) {
      names = await fetchIbgeNeighborhoodNames(municipioId);
    }

    if (names.length === 0) {
      names = ['Centro', 'Alagoinhas Velha', 'Barreiro', 'Santa Teresinha', 'Jardim Petrolar'];
    }

    const supabase = getServiceClient();
    const rows = names.map((name) => ({ city: String(city), name, active: true }));

    const { error: upsertError } = await supabase
      .from('neighborhoods')
      .upsert(rows, { onConflict: 'city,name', ignoreDuplicates: false });

    if (upsertError) {
      return jsonResponse({ ok: false, error: upsertError.message }, 500, req);
    }

    const { data, error } = await supabase
      .from('neighborhoods')
      .select('id, city, name, active, created_at')
      .eq('city', String(city))
      .order('name');

    if (error) {
      return jsonResponse({ ok: false, error: error.message }, 500, req);
    }

    return jsonResponse({
      ok: true,
      neighborhoods: data ?? [],
      ibge_count: names.length,
    }, 200, req);
  } catch (err) {
    console.error('[fetch-neighborhoods]', err);
    return jsonResponse({ ok: false, error: String(err) }, 500, req);
  }
});
