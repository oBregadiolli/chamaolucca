export function effectivePrice(product) {
  const price = Number(product?.price ?? 0);
  const promo = product?.promotional_price != null ? Number(product.promotional_price) : null;
  if (promo != null && promo > 0 && promo < price) return promo;
  return price;
}

function roundMoney(value) {
  return Number((Number(value) || 0).toFixed(2));
}

function itemProductId(item) {
  return item?.product_id ?? item?.id ?? null;
}

function itemUnitPrice(item) {
  return Number(item?.unit_price ?? item?.price ?? 0);
}

function isPromotionActive(promotion, now = new Date()) {
  if (!promotion?.active) return false;
  if (promotion.starts_at && new Date(promotion.starts_at) > now) return false;
  if (promotion.ends_at && new Date(promotion.ends_at) < now) return false;
  return true;
}

function productName(product, fallback = 'Produto') {
  return product?.name || fallback;
}

export function attachPromotionProducts(promotions, products) {
  const byId = new Map((products ?? []).map((product) => [product.id, product]));
  return (promotions ?? []).map((promotion) => ({
    ...promotion,
    trigger_product: promotion.trigger_product ?? byId.get(promotion.trigger_product_id) ?? null,
    reward_product: promotion.reward_product ?? byId.get(promotion.reward_product_id) ?? null,
  }));
}

export function getPromotionProductIds(promotions) {
  return [
    ...new Set(
      (promotions ?? [])
        .flatMap((promotion) => [promotion.trigger_product_id, promotion.reward_product_id])
        .filter(Boolean),
    ),
  ];
}

export function evaluatePromotions(items = [], promotions = [], options = {}) {
  const now = options.now ?? new Date();
  const normalizedItems = (items ?? [])
    .map((item) => ({
      ...item,
      product_id: itemProductId(item),
      quantity: Number(item.quantity ?? 0),
      unit_price: itemUnitPrice(item),
    }))
    .filter((item) => item.product_id && item.quantity > 0);

  const baseSubtotal = roundMoney(
    normalizedItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0),
  );
  const itemsByProduct = new Map(normalizedItems.map((item) => [item.product_id, item]));
  const activePromotions = (promotions ?? [])
    .filter((promotion) => isPromotionActive(promotion, now))
    .sort((a, b) => Number(a.priority ?? 100) - Number(b.priority ?? 100));

  const eligible = [];
  const nudges = [];
  const specialPriceByProduct = new Map();
  const freeRewards = [];
  const freeRewardKeys = new Set();

  for (const promotion of activePromotions) {
    const minSubtotal = Number(promotion.min_subtotal ?? 0);
    const missingAmount = roundMoney(Math.max(0, minSubtotal - baseSubtotal));
    const rewardId = promotion.reward_product_id;
    const rewardProduct = promotion.reward_product ?? null;
    const triggerId = promotion.trigger_product_id;
    const triggerProduct = promotion.trigger_product ?? null;
    const rewardLabel = productName(rewardProduct);
    const triggerLabel = productName(triggerProduct, rewardLabel);

    if (promotion.type === 'product_price') {
      const cartItem = itemsByProduct.get(rewardId);
      const rewardPrice = Number(promotion.reward_price ?? 0);

      if (missingAmount > 0) {
        nudges.push({
          promotion,
          kind: 'missing_subtotal',
          missingAmount,
          message: `Faltam {{amount}} para liberar ${rewardLabel} por {{price}}.`,
          amount: missingAmount,
          price: rewardPrice,
        });
        continue;
      }

      if (!cartItem) {
        nudges.push({
          promotion,
          kind: 'add_reward_product',
          productId: rewardId,
          message: `Adicione ${rewardLabel} para usar a oferta.`,
        });
        continue;
      }

      if (specialPriceByProduct.has(rewardId)) continue;

      const affectedQuantity = Math.min(
        cartItem.quantity,
        Number(promotion.max_quantity_per_order ?? 1),
      );
      const discountAmount = roundMoney(
        Math.max(0, cartItem.unit_price - rewardPrice) * affectedQuantity,
      );

      if (affectedQuantity > 0 && discountAmount > 0) {
        const reward = {
          promotion,
          type: 'product_price',
          productId: rewardId,
          productName: rewardLabel,
          originalPrice: cartItem.unit_price,
          rewardPrice,
          quantity: affectedQuantity,
          discountAmount,
        };
        specialPriceByProduct.set(rewardId, reward);
        eligible.push(reward);
      }
    }

    if (promotion.type === 'free_product') {
      const triggerItem = itemsByProduct.get(triggerId);

      if (missingAmount > 0) {
        nudges.push({
          promotion,
          kind: 'missing_subtotal',
          missingAmount,
          message: `Faltam {{amount}} para liberar ${rewardLabel} gratis.`,
          amount: missingAmount,
        });
        continue;
      }

      if (!triggerItem) {
        nudges.push({
          promotion,
          kind: 'add_trigger_product',
          productId: triggerId,
          message: `Adicione ${triggerLabel} para ganhar ${rewardLabel}.`,
        });
        continue;
      }

      if (rewardProduct && rewardProduct.active === false) continue;

      const key = `${promotion.id}:${rewardId}`;
      if (freeRewardKeys.has(key)) continue;
      freeRewardKeys.add(key);

      const reward = {
        promotion,
        type: 'free_product',
        productId: rewardId,
        productName: rewardLabel,
        product: rewardProduct,
        quantity: Number(promotion.max_quantity_per_order ?? 1),
        discountAmount: 0,
      };
      freeRewards.push(reward);
      eligible.push(reward);
    }
  }

  const promotionDiscount = roundMoney(
    eligible.reduce((sum, reward) => sum + Number(reward.discountAmount ?? 0), 0),
  );

  return {
    baseSubtotal,
    promotionDiscount,
    promotionSubtotal: roundMoney(Math.max(0, baseSubtotal - promotionDiscount)),
    eligible,
    nudges,
    specialPriceByProduct,
    freeRewards,
  };
}

export function applyPromotionsToLineItems(lineItems, evaluation) {
  const result = [];
  const specials = evaluation?.specialPriceByProduct ?? new Map();

  for (const item of lineItems ?? []) {
    const special = specials.get(item.product_id);
    if (!special || special.rewardPrice >= Number(item.unit_price)) {
      result.push(item);
      continue;
    }

    const promoQuantity = Math.min(Number(item.quantity), Number(special.quantity));
    const regularQuantity = Number(item.quantity) - promoQuantity;

    if (promoQuantity > 0) {
      result.push({
        ...item,
        quantity: promoQuantity,
        unit_price: roundMoney(special.rewardPrice),
      });
    }

    if (regularQuantity > 0) {
      result.push({
        ...item,
        quantity: regularQuantity,
      });
    }
  }

  for (const reward of evaluation?.freeRewards ?? []) {
    if (!reward.product) continue;
    result.push({
      product_id: reward.productId,
      product_name: `${productName(reward.product)} (brinde)`,
      quantity: Number(reward.quantity ?? 1),
      unit_price: 0,
      image_url: reward.product.image_url || null,
    });
  }

  return result;
}
