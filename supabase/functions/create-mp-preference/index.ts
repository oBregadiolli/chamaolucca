import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MP_PREFERENCE_API = 'https://api.mercadopago.com/checkout/preferences';
const MP_PAYMENTS_API = 'https://api.mercadopago.com/v1/payments';

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

    // Valida se o pedido pertence ao usuário autenticado
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

    // ── FLUXO PIX DIRETO (SEM LOGIN / SEM EXIGIR CONTA MERCADO PAGO) ──
    if (payment_method === 'pix') {
      const totalAmount = mpItems.reduce(
        (acc: number, item: { unit_price: number; quantity: number }) => acc + item.unit_price * item.quantity,
        0,
      );

      const pixPayload = {
        transaction_amount: Number(Math.max(0.01, totalAmount).toFixed(2)),
        description: `Pedido #${order_number || order_id} - Chama o Lucca`,
        payment_method_id: 'pix',
        payer: {
          email: payer_email || 'cliente@chamaolucca.com.br',
          first_name: payer_name || 'Cliente',
        },
        external_reference: String(order_id),
        notification_url: supabaseUrl ? `${supabaseUrl}/functions/v1/mp-webhook` : undefined,
      };

      const pixRes = await fetch(MP_PAYMENTS_API, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `${order_id}_${Date.now()}`,
        },
        body: JSON.stringify(pixPayload),
      });

      const pixData = await pixRes.json();
      if (pixRes.ok && pixData.point_of_interaction?.transaction_data) {
        const transactionData = pixData.point_of_interaction.transaction_data;

        // Grava no banco o QR Code e o Código Copia e Cola
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        if (serviceRoleKey && supabaseUrl) {
          const serviceClient = createClient(supabaseUrl, serviceRoleKey);
          await serviceClient.from('orders').update({
            pix_qr_code: transactionData.qr_code,
            pix_expires_at: pixData.date_of_expiration,
            payment_id: String(pixData.id),
          }).eq('id', order_id);
        }

        return jsonResponse({
          ok: true,
          is_direct_pix: true,
          pix_qr_code: transactionData.qr_code,
          pix_qr_code_base64: transactionData.qr_code_base64,
          payment_id: pixData.id,
          ticket_url: transactionData.ticket_url,
          checkout_url: transactionData.ticket_url || `${baseUrl}/pedido/${order_id}`,
        }, 200, req);
      }
      // Pix direto falhou: NÃO cair no Checkout Pro. No celular, o Checkout Pro
      // faz deep-link pro app do Mercado Pago e empurra criação de conta —
      // exatamente o que queremos evitar. Retorna erro para o app mostrar
      // in-app e o cliente tentar de novo, mantendo o fluxo Pix sem login.
      console.error('[create-mp-preference] Pix direto falhou', pixData);
      return jsonResponse({
        ok: false,
        error: pixData?.message || 'Não foi possível gerar o Pix agora. Tente novamente.',
      }, 400, req);
    }

    // ── FLUXO PREFERENCE (CARTÃO / CHECKOUT PRO) ──
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
      binary_mode: true,
      statement_descriptor: 'CHAMAO LUCCA',
      notification_url: supabaseUrl ? `${supabaseUrl}/functions/v1/mp-webhook` : undefined,
      metadata: {
        order_id,
        order_number,
      },
    };

    if (payment_method === 'credit') {
      preference.payment_methods = {
        excluded_payment_types: [{ id: 'ticket' }, { id: 'debit_card' }],
      };
    } else if (payment_method === 'debit') {
      preference.payment_methods = {
        excluded_payment_types: [{ id: 'ticket' }, { id: 'credit_card' }],
      };
    }

    const res = await fetch(MP_PREFERENCE_API, {
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
