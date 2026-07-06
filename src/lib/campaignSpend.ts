// Ad spend isn't tracked as its own metric — it's derived from delivered
// impressions at a flat rate per impression.
export const SPEND_PER_IMPRESSION = 0.1

export function computeSpend(impressionsUsed: number): number {
  return impressionsUsed * SPEND_PER_IMPRESSION
}
