import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

const CartContext = createContext({});

// ── localStorage helpers ─────────────────────────────────
const LS_KEY = 'lucca_cart';

function readLS() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function writeLS(items) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
  } catch { /* quota exceeded — silently fail */ }
}

function clearLS() {
  try { localStorage.removeItem(LS_KEY); } catch { /* noop */ }
}

/**
 * CartContext — Dual Storage (localStorage + Supabase)
 *
 * Estratégia:
 *  1. Estado inicial lido do localStorage (síncrono, 0ms — nunca "pisca")
 *  2. Quando usuário loga → carrega banco, merge com local, persiste ambos
 *  3. Toda mutação (add/remove/update) → grava state + localStorage + banco
 *  4. Quando volta de redirect externo (MP) → localStorage garante carrinho intacto
 *  5. Deslogou → mantém localStorage para merge futuro
 *
 * Performance:
 *  - Zero flickering: localStorage é síncrono no primeiro render
 *  - Supabase sync é fire-and-forget (não bloqueia UI)
 *  - Merge inteligente: soma quantidades p/ produtos duplicados
 *  - mergeInProgress ref previne race conditions
 */
export function CartProvider({ children }) {
  // Estado inicial: lê localStorage sincronamente (sem delay)
  const [cartId,       setCartId]       = useState(null);
  const [items,        setItems]        = useState(() => readLS());
  const [isOpen,       setIsOpen]       = useState(false);
  const [userId,       setUserId]       = useState(null);
  const [syncFailure,  setSyncFailure]  = useState(false);

  // Refs para evitar race conditions
  const mergeInProgress  = useRef(false);
  const pendingLocalItems = useRef([]);
  const itemsRef         = useRef(items);
  const userIdRef        = useRef(userId);
  const cartIdRef        = useRef(cartId);

  // Mantém refs sincronizados
  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { userIdRef.current = userId; }, [userId]);
  useEffect(() => { cartIdRef.current = cartId; }, [cartId]);

  // ── Sync localStorage a cada mudança de items ──────────
  // Usa ref para debounce leve — evita writes excessivos em loops rápidos
  const lsTimerRef = useRef(null);
  useEffect(() => {
    if (lsTimerRef.current) clearTimeout(lsTimerRef.current);
    lsTimerRef.current = setTimeout(() => writeLS(items), 50);
    return () => { if (lsTimerRef.current) clearTimeout(lsTimerRef.current); };
  }, [items]);

  // ── Observa sessão ────────────────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null;
      const prevUserId = userIdRef.current;

      if (uid && uid !== prevUserId) {
        // Logando — captura itens locais (do localStorage) para merge
        pendingLocalItems.current = [...itemsRef.current].filter(i => i.quantity > 0);
      }

      if (!uid && prevUserId) {
        // Deslogou — limpa state mas MANTÉM localStorage
        // (assim quando logar de novo, faz merge)
        setCartId(null);
        mergeInProgress.current = false;
        // Não limpa items — se quiser limpar ao deslogar, descomente:
        // setItems([]); clearLS();
      }

      setUserId(uid);
    });
    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Carrega/merge carrinho ao logar ───────────────────
  useEffect(() => {
    if (userId) {
      loadAndMergeCart(userId);
    } else {
      mergeInProgress.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function loadAndMergeCart(uid) {
    if (mergeInProgress.current) return;
    mergeInProgress.current = true;
    setSyncFailure(false);

    try {
      // 1. Busca/cria cart ativo no banco
      let cid = await getOrCreateCart(uid);
      setCartId(cid);

      // 2. Carrega itens do banco
      const { data: cartItemsDB } = await supabase
        .from('cart_items')
        .select('*, products(id, name, price, image_url, unit)')
        .eq('cart_id', cid);

      const dbItems = (cartItemsDB ?? []).map((ci) => ({
        cartItemId: ci.id,
        id:         ci.product_id,
        name:       ci.products?.name   || '',
        price:      parseFloat(ci.unit_price),
        image_url:  ci.products?.image_url || null,
        unit:       ci.products?.unit   || 'un',
        quantity:   ci.quantity,
      }));

      const localItems = pendingLocalItems.current;
      pendingLocalItems.current = [];

      // 3. Merge inteligente
      const merged = mergeItems(dbItems, localItems);

      // 4. Atualiza state + localStorage
      setItems(merged);

      // 5. Persiste merge no banco (se houve itens locais para mergear)
      if (localItems.length > 0 && merged.length > 0) {
        const upsertPayload = merged.map(item => ({
          cart_id:    cid,
          product_id: item.id,
          quantity:   item.quantity,
          unit_price: item.price,
        }));

        const { error: upsertErr } = await supabase
          .from('cart_items')
          .upsert(upsertPayload, { onConflict: 'cart_id,product_id', ignoreDuplicates: false });

        if (upsertErr) {
          console.warn('[Cart] merge upsert failed:', upsertErr.message);
          setSyncFailure(true);
        }
      }
    } catch (err) {
      console.warn('[Cart] loadAndMergeCart error:', err.message);
      setSyncFailure(true);
      // Em caso de falha no banco, mantém os itens do localStorage
      // (que já estavam no state desde o início)
    } finally {
      mergeInProgress.current = false;
    }
  }

  async function getOrCreateCart(uid) {
    // Tenta buscar cart ativo
    let { data: existing } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', uid)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);

    if (existing && existing.length > 0) return existing[0].id;

    // Limpa carts converted antigos
    await supabase
      .from('carts')
      .delete()
      .eq('user_id', uid)
      .eq('status', 'converted');

    // Cria novo
    const { data: newCart, error } = await supabase
      .from('carts')
      .insert({ user_id: uid, status: 'active' })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        // Race condition — busca de novo
        const { data: refetch } = await supabase
          .from('carts')
          .select('id')
          .eq('user_id', uid)
          .eq('status', 'active')
          .limit(1)
          .single();
        if (refetch) return refetch.id;
      }
      throw new Error('Falha ao criar carrinho.');
    }
    return newCart.id;
  }

  // ── Merge inteligente: banco + local ──────────────────
  function mergeItems(dbItems, localItems) {
    if (localItems.length === 0) return dbItems;
    if (dbItems.length === 0) return localItems;

    const merged = [...dbItems];
    for (const local of localItems) {
      const idx = merged.findIndex(m => m.id === local.id);
      if (idx >= 0) {
        // Mesmo produto: usa a maior quantidade (evita perda de adições)
        merged[idx] = {
          ...merged[idx],
          quantity: Math.max(merged[idx].quantity, local.quantity),
        };
      } else {
        merged.push(local);
      }
    }
    return merged;
  }

  // ── Helpers de sync com banco (fire-and-forget) ───────

  function syncUpsert(productId, quantity, unitPrice) {
    const cid = cartIdRef.current;
    if (!cid) return;
    supabase
      .from('cart_items')
      .upsert(
        { cart_id: cid, product_id: productId, quantity, unit_price: unitPrice },
        { onConflict: 'cart_id,product_id', ignoreDuplicates: false }
      )
      .then(({ error }) => {
        if (error) console.warn('[Cart] sync upsert failed:', error.message);
      });
  }

  function syncDelete(productId) {
    const cid = cartIdRef.current;
    if (!cid) return;
    supabase
      .from('cart_items')
      .delete()
      .eq('cart_id', cid)
      .eq('product_id', productId)
      .then(({ error }) => {
        if (error) console.warn('[Cart] sync delete failed:', error.message);
      });
  }

  async function syncClearAll() {
    const cid = cartIdRef.current;
    if (!cid) return;
    await supabase.from('cart_items').delete().eq('cart_id', cid);
    await supabase.from('carts').delete().eq('id', cid);
    setCartId(null);
  }

  // ── Actions ───────────────────────────────────────────

  const addItem = useCallback((product) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      let next;
      if (existing) {
        next = prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        next = [...prev, { ...product, quantity: 1 }];
      }
      const newQty = existing ? existing.quantity + 1 : 1;
      syncUpsert(product.id, newQty, product.price);
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const removeItem = useCallback((productId) => {
    setItems((prev) => prev.filter((item) => item.id !== productId));
    syncDelete(productId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateQuantity = useCallback((productId, quantity) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((item) => item.id !== productId));
      syncDelete(productId);
      return;
    }
    setItems((prev) => {
      const next = prev.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      );
      const item = prev.find((i) => i.id === productId);
      if (item) syncUpsert(productId, quantity, item.price);
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    clearLS();
    syncClearAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismissSyncFailure = useCallback(() => setSyncFailure(false), []);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal   = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const value = {
    items,
    isOpen,
    setIsOpen,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    totalItems,
    subtotal,
    cartId,
    syncFailure,
    dismissSyncFailure,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
}
