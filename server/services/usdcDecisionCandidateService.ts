import type {
  UsdcCurrentPosition,
  UsdcDecisionCandidateResponse
} from '../types/position'
import type { YieldOpportunity } from '../types/yield'
import { getUsdcMarketOpportunities } from './usdcMarketService'

/**
 * Same-product identity uses domain fields only.
 * sourcePoolId is provider provenance and is not required for Portfolio matching.
 */
export function isSameUsdcProduct (
  position: UsdcCurrentPosition,
  opportunity: YieldOpportunity
): boolean {
  return opportunity.asset === position.asset
    && opportunity.protocol === position.protocol
    && opportunity.product === position.product
    && opportunity.opportunityType === position.opportunityType
    && opportunity.chain === position.chain
}

/**
 * Conservative candidate eligibility.
 * Different opportunityType does not automatically disqualify.
 * Market Service already owns DataQuality evaluation; we only defensively confirm VERIFIED.
 */
function isDecisionCandidate (
  position: UsdcCurrentPosition,
  opportunity: YieldOpportunity
): boolean {
  if (opportunity.asset !== position.asset) {
    return false
  }

  if (opportunity.dataQuality !== 'VERIFIED') {
    return false
  }

  if (isSameUsdcProduct(position, opportunity)) {
    return false
  }

  return true
}

/**
 * Decision Candidates = Market Universe filtered by current position relevance.
 * Does not fetch providers, re-evaluate APY quality rules, or produce recommendations.
 */
export async function getUsdcDecisionCandidates (
  currentPosition: UsdcCurrentPosition
): Promise<UsdcDecisionCandidateResponse> {
  const market = await getUsdcMarketOpportunities()

  const candidates = market.data.filter(opportunity =>
    isDecisionCandidate(currentPosition, opportunity)
  )

  return {
    currentPosition,
    candidates,
    meta: market.meta
  }
}
