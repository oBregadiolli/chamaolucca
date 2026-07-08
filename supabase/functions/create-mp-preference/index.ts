import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MP_API = 'https://api.mercadopago.com/checkout/preferences';

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const token = Deno.env.get('MP_ACCESS_TOKEN');
    if (!token) {
      return jsonResponse({ ok: false, error: 'MP_ACCESS_TOKEN não configurado' }, 500, req);
    }

    const body = await req.json();
    const {
      order_id,
      order_number,
      items = [],
      payer_email,
      payer_name,
      shipping = 0,
      discount = 0,
      app_url,
      payment_method: rawPaymentMethod,
    } = body;

    const payment_method =
      rawPaymentMethod === 'credit_card' ? 'credit'
      : rawPaymentMethod === 'debit_card' ? 'debit'
      : rawPaymentMethod;

    if (!order_id || !items.length) {
      return jsonResponse({ ok: false, error: 'order_id e items são obrigatórios' }, 400, req);
    }

    // B2: valida que o pedido pertence ao usuário autenticado
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: orderRow } = await supabase
        .from('orders')
        .select('id, user_id')
        .eq('id', order_id)
        .maybeSingle();
      if (!orderRow) {
        return jsonResponse({ ok: false, error: 'Pedido não encontrado' }, 404, req);
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (user && orderRow.user_id !== user.id) {
        return jsonResponse({ ok: false, error: 'Acesso negado ao pedido' }, 403, req);
      }
    }

    const baseUrl = (app_url || 'http://localhost:5173').replace(/\/$/, '');
    const supabaseUrl = (Deno.env.get('SUPABASE_URL') || '').replace(/\/$/, '');
    const mpItems = items.map((item: { title: string; quantity: number; unit_price: number }) => ({
      title: item.title,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      currency_id: 'BRL',
    }));

    const shippingNum = Number(shipping) || 0;
    if (shippingNum > 0) {
      mpItems.push({
        title: 'Frete',
        quantity: 1,
        unit_price: shippingNum,
        currency_id: 'BRL',
      });
    }

    const discountNum = Number(discount) || 0;
    if (discountNum > 0) {
      mpItems.push({
        title: 'Desconto cupom',
        quantity: 1,
        unit_price: -discountNum,
        currency_id: 'BRL',
      });
    }

    const preference: Record<string, unknown> = {
      items: mpItems,
      payer: {
        email: payer_email || 'cliente@chamaolucca.com.br',
        name: payer_name || 'Cliente',
      },
      external_reference: String(order_id),
      back_urls: {
        success: `${baseUrl}/pedido/${order_id}?mp_status=approved`,
        failure: `${baseUrl}/pedido/${order_id}?mp_status=failure`,
        pending: `${baseUrl}/pedido/${order_id}?mp_status=pending`,
      },
      auto_return: 'approved',
      statement_descriptor: 'CHAMAO LUCCA',
      notification_url: supabaseUrl ? `${supabaseUrl}/functions/v1/mp-webhook` : undefined,
      metadata: {
        order_id,
        order_number,
      },
    };

    if (payment_method === 'pix') {
      // Exclui cartões e boleto → só Pix disponível. MP seleciona automaticamente.
      preference.payment_methods = {
        excluded_payment_types: [
          { id: 'credit_card' },
          { id: 'debit_card' },
          { id: 'ticket' },
        ],
      };
    } else if (payment_method === 'credit') {
      preference.payment_methods = {
        excluded_payment_types: [{ id: 'ticket' }, { id: 'debit_card' }],
      };
    } else if (payment_method === 'debit') {
      preference.payment_methods = {
        excluded_payment_types: [{ id: 'ticket' }, { id: 'credit_card' }],
      };
    }

    const res = await fetch(MP_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preference),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('[create-mp-preference]', data);
      return jsonResponse({
        ok: false,
        error: data.message || data.error || 'Erro ao criar preferência no Mercado Pago',
      }, 400, req);
    }

    const checkoutUrl = data.init_point || data.sandbox_init_point;
    if (!checkoutUrl) {
      return jsonResponse({ ok: false, error: 'Mercado Pago não retornou URL de checkout' }, 500, req);
    }

    return jsonResponse({ ok: true, checkout_url: checkoutUrl, preference_id: data.id }, 200, req);
  } catch (err) {
    console.error('[create-mp-preference]', err);
    return jsonResponse({ ok: false, error: String(err) }, 500, req);
  }
});
