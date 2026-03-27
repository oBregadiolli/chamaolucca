import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

const CartContext = createContext({});

/**
 * CartContext — Carrinho persistido no Supabase (carts + cart_items).
 *
 * Estratégia de merge ao logar:
 *  1. Captura itens locais ANTES de buscar o banco
 *  2. Carrega carrinho ativo do banco
 *  3. Merge: soma quantidades para produtos iguais, mantém itens únicos de ambos
 *  4. Persiste o resultado no banco
 *  5. Limpa a referência local temporária
 *
 * Race conditions evitadas:
 *  - mergeInProgress ref impede duplos disparo
 *  - upsert nativo no banco previne conflitos de escrita
 *  - syncFailure expõe erros para feedback mínimo ao usuário
 */

export function CartProvider({ children }) {
  const [cartId,       setCartId]       = useState(null);
  const [items,        setItems]        = useState([]);
  const [isOpen,       setIsOpen]       = useState(false);
  const [userId,       setUserId]       = useState(null);
  const [syncFailure,  setSyncFailure]  = useState(false); // feedback de falha de sync

  // Refs para evitar race conditions
  const mergeInProgress = useRef(false);
  const pendingLocalItems = useRef([]); // itens antes do login

  // ── Observa sessão ────────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null;

      if (uid && uid !== userId) {
        // Different user logging in — capture current local items for merge,
        // then immediately clear state so stale items from previous user don't bleed through
        pendingLocalItems.current = userId === null ? [...items].filter(i => i.quantity > 0) : [];
        setItems([]);   // ← clear immediately on user switch
        setCartId(null);
      }

      if (!uid) {
        // Logged out — wipe everything
        setItems([]);
        setCartId(null);
        pendingLocalItems.current = [];
        mergeInProgress.current = false;
      }

      setUserId(uid);
    });
    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, items]);

  // ── Carrega/merge carrinho ao logar ──────────
  useEffect(() => {
    if (userId) {
      loadAndMergeCart(userId);
    } else {
      // deslogou → já limpo no onAuthStateChange acima
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
      let { data: existingCarts } = await supabase
        .from('carts')
        .select('id')
        .eq('user_id', uid)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);

      let cid;
      if (existingCarts && existingCarts.length > 0) {
        cid = existingCarts[0].id;
      } else {
        // Before inserting, remove any old converted carts for this user
        // to avoid unique constraint violation on (user_id, status)
        await supabase
          .from('carts')
          .delete()
          .eq('user_id', uid)
          .eq('status', 'converted');

        const { data: newCart, error } = await supabase
          .from('carts')
          .insert({ user_id: uid, status: 'active' })
          .select()
          .single();

        if (error) {
          // If race condition hit the unique constraint, just re-fetch
          if (error.code === '23505') {
            const { data: refetch } = await supabase
              .from('carts')
              .select('id')
              .eq('user_id', uid)
              .eq('status', 'active')
              .limit(1)
              .single();
            if (refetch) {
              cid = refetch.id;
            } else {
              throw new Error('Falha ao recuperar carrinho após conflito.');
            }
          } else {
            throw new Error('Falha ao criar carrinho.');
          }
        } else {
          cid = newCart.id;
        }
      }

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

      // 3. Merge: se não há itens locais pendentes, usa apenas o banco
      if (localItems.length === 0) {
        setItems(dbItems);
        return;
      }

      // Merge real: soma quantidades p/ produtos iguais, mantém itens únicos
      const merged = [...dbItems];
      for (const local of localItems) {
        const idx = merged.findIndex(m => m.id === local.id);
        if (idx >= 0) {
          merged[idx] = { ...merged[idx], quantity: merged[idx].quantity + local.quantity };
        } else {
          merged.push(local);
        }
      }

      setItems(merged);

      // 4. Persiste o merge no banco (upsert atômico)
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
        console.warn('[CartContext] merge upsert failed:', upsertErr.message);
        setSyncFailure(true); // notifica UI, mas não reverte visualmente
      }

    } catch (err) {
      console.warn('[CartContext] loadAndMergeCart error:', err.message);
      setSyncFailure(true);
    } finally {
      mergeInProgress.current = false;
    }
  }

  // ── Helpers de sync ──────────────────────────

  async function upsertCartItem(productId, quantity, unitPrice) {
    if (!cartId) return;
    await supabase
      .from('cart_items')
      .upsert(
        { cart_id: cartId, product_id: productId, quantity, unit_price: unitPrice },
        { onConflict: 'cart_id,product_id', ignoreDuplicates: false }
      );
  }

  async function deleteCartItem(productId) {
    if (!cartId) return;
    await supabase
      .from('cart_items')
      .delete()
      .eq('cart_id', cartId)
      .eq('product_id', productId);
  }

  async function clearCartInDB() {
    if (!cartId) return;
    await supabase.from('cart_items').delete().eq('cart_id', cartId);
    // Delete the cart entirely instead of setting 'converted'
    // This avoids unique constraint issues when creating a new active cart later
    await supabase.from('carts').delete().eq('id', cartId);
    setCartId(null);
  }

  // ── Actions ──────────────────────────────────

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
      upsertCartItem(product.id, newQty, product.price);
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartId]);

  const removeItem = useCallback((productId) => {
    setItems((prev) => prev.filter((item) => item.id !== productId));
    deleteCartItem(productId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartId]);

  const updateQuantity = useCallback((productId, quantity) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((item) => item.id !== productId));
      deleteCartItem(productId);
      return;
    }
    setItems((prev) => {
      const next = prev.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      );
      const item = prev.find((i) => i.id === productId);
      if (item) upsertCartItem(productId, quantity, item.price);
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartId]);

  const clearCart = useCallback(() => {
    setItems([]);
    clearCartInDB();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartId]);

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
