import Icon from '../ui/Icon';
import { formatCurrency } from '../../lib/utils';

function formatNudge(nudge) {
  return (nudge.message || '')
    .replace('{{amount}}', formatCurrency(nudge.amount ?? nudge.missingAmount ?? 0))
    .replace('{{price}}', formatCurrency(nudge.price ?? 0));
}

function rewardMessage(reward) {
  if (reward.type === 'free_product') {
    return `Oferta liberada: ${reward.quantity}x ${reward.productName} grátis.`;
  }
  return `Oferta liberada: ${reward.quantity}x ${reward.productName} por ${formatCurrency(reward.rewardPrice)}.`;
}

export default function PromotionMessages({ rewards = [], nudges = [], compact = false }) {
  const visibleRewards = rewards.slice(0, compact ? 1 : 3);
  const visibleNudges = rewards.length > 0 ? [] : nudges.slice(0, compact ? 1 : 2);

  if (visibleRewards.length === 0 && visibleNudges.length === 0) return null;

  return (
    <div className={`promo-messages${compact ? ' promo-messages--compact' : ''}`}>
      {visibleRewards.map((reward) => (
        <div key={`${reward.promotion.id}-${reward.type}`} className="promo-message promo-message--active">
          <Icon name="sell" size={16} />
          <span>{rewardMessage(reward)}</span>
        </div>
      ))}

      {visibleNudges.map((nudge) => (
        <div key={`${nudge.promotion.id}-${nudge.kind}`} className="promo-message">
          <Icon name="local_offer" size={16} />
          <span>{formatNudge(nudge)}</span>
        </div>
      ))}
    </div>
  );
}
