import type { Event, TicketInfo } from '@/types/event';
import { basePriceTaxPercent } from '@/utils/basePriceTax';

/** Per-seat total for a pricing tier (same formula as seats page load). */
export function pricingTierPerSeatTotal(tier: {
  basePrice?: number;
  tax?: number;
  serviceFee?: number;
  serviceTax?: number;
}): number {
  const basePrice = tier.basePrice || 0;
  const taxMult = (tier.tax || 0) / 100;
  const serviceFee = tier.serviceFee || 0;
  const serviceTaxMult = (tier.serviceTax || 0) / 100;
  return (
    Math.round(
      (basePrice + basePrice * taxMult + serviceFee + serviceFee * serviceTaxMult) * 1000
    ) / 1000
  );
}

/** Full line total for one ticket_info ticket (aligned with checkout / seats ticket path). */
export function ticketInfoLineTotal(ticket: TicketInfo): number {
  const basePrice = Number(ticket.price ?? 0);
  const serviceFee = Number(ticket.serviceFee ?? 0);
  const baseTaxPct = basePriceTaxPercent(ticket.vat ?? 0, ticket.entertainmentTax);
  const serviceTaxMult = (Number(ticket.serviceTax ?? 0) || 0) / 100;
  const orderFee = Number(ticket.orderFee ?? 0);
  const baseTaxAmount = basePrice * (baseTaxPct / 100);
  const serviceTaxOnFee = serviceFee * serviceTaxMult;
  const orderFeeTax = orderFee * serviceTaxMult;
  return (
    Math.round(
      (basePrice + serviceFee + baseTaxAmount + serviceTaxOnFee + orderFee + orderFeeTax) * 100
    ) / 100
  );
}

/**
 * Minimum “from” price for event cards: pricing_configuration → min tier total;
 * ticket_info → min full ticket line; falls back when data missing.
 */
export function eventCardMinDisplayPrice(event: Event): number | null {
  const rawPricingModel = String(event.venue?.pricingModel ?? '').trim();
  const normalizedPricingModel =
    rawPricingModel === 'pricing_configuration' || rawPricingModel === 'pricingConfig'
      ? 'pricing_configuration'
      : rawPricingModel === 'ticket_info' || rawPricingModel === 'ticketInfo'
        ? 'ticket_info'
        : 'ticket_info';

  const tiers = event.pricingConfig?.tiers;

  // ticket_info must always use ticket-based pricing (never pricingConfig tiers)
  if (normalizedPricingModel === 'ticket_info') {
    if (!Array.isArray(event.ticketInfo) || event.ticketInfo.length === 0) {
      return null;
    }
    return Math.min(...event.ticketInfo.map(ticketInfoLineTotal));
  }

  // pricing_configuration uses tier pricing only.
  if (tiers && tiers.length > 0) {
    return Math.min(...tiers.map(pricingTierPerSeatTotal));
  }
  return null;
}
