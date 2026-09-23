import type {
  UsdcCurrentPosition,
  UsdcDecisionCandidateResponse
} from '../types/position'
import type { YieldOpportunity } from '../types/yield'
import { MARKET_CHAINS } from '../marketRegistry'
import { getMultiScopedMarketDashboard } from './scopedMarketDashboardService'

function normalizeProductName (value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/\busdc\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Same-product identity uses domain fields only.
 * sourcePoolId is provider provenance and is not required for Portfolio matching.
 */
export function isSameUsdcProduct (
  position: UsdcCurrentPosition,
  opportunity: YieldOpportunity
): boolean {
  return opportunity.asset === position.asset
    && opportunity.protocol.toLocaleLowerCase() === position.protocol.toLocaleLowerCase()
    && normalizeProductName(opportunity.product) === normalizeProductName(position.product)
    && opportunity.chain.toLocaleLowerCase() === position.chain.toLocaleLowerCase()
}

/**
 * Conservative candidate eligibility.
 * Market Service already owns DataQuality evaluation; we only defensively confirm VERIFIED
 * and enforce the current position's chain and rate convention.
 */
function isDecisionCandidate (
  position: UsdcCurrentPosition,
  opportunity: YieldOpportunity,
  currentPositionRate: UsdcDecisionCandidateResponse['currentPositionRate']
): boolean {
  if (opportunity.asset !== position.asset) {
    return false
  }

  if (opportunity.dataQuality !== 'VERIFIED') {
    return false
  }

  if (opportunity.chain.toLocaleLowerCase() !== position.chain.toLocaleLowerCase()) {
    return false
  }

  if (!currentPositionRate || opportunity.rateType !== currentPositionRate.rateType) {
    return false
  }

  if (opportunity.rate <= currentPositionRate.rate) {
    return false
  }

  if (isSameUsdcProduct(position, opportunity)) {
    return false
  }

  return true
}

/**
 * Look up the current position product in the Market Universe for a factual rate.
 * Returns null when neither Portfolio nor the Market Universe provides a verified rate.
 */
function resolveCurrentPositionRate (
  position: UsdcCurrentPosition,
  opportunities: YieldOpportunity[]
): UsdcDecisionCandidateResponse['currentPositionRate'] {
  if (
    position.rate !== undefined
    && Number.isFinite(position.rate)
    && position.rateType !== undefined
  ) {
    return {
      rate: position.rate,
      rateType: position.rateType
    }
  }

  const match = opportunities.find(opportunity =>
    isSameUsdcProduct(position, opportunity)
    && opportunity.dataQuality === 'VERIFIED'
  )

  if (!match) {
    return null
  }

  return {
    rate: match.rate,
    rateType: match.rateType
  }
}

/**
 * Decision Candidates = Market Universe filtered by current position relevance.
 * Does not fetch providers, re-evaluate APY quality rules, or produce recommendations.
 */
export async function getUsdcDecisionCandidates (
  currentPosition: UsdcCurrentPosition
): Promise<UsdcDecisionCandidateResponse> {
  const marketChain = MARKET_CHAINS.find(chain =>
    chain.label.toLocaleLowerCase() === currentPosition.chain.toLocaleLowerCase()
  )
  if (!marketChain) throw new Error(`Unsupported USDC comparison chain: ${currentPosition.chain}`)

  const market = await getMultiScopedMarketDashboard([marketChain.key], ['USDC'], { limit: 100 })

  const currentPositionRate = resolveCurrentPositionRate(currentPosition, market.data)

  const candidates = market.data.filter(opportunity =>
    isDecisionCandidate(currentPosition, opportunity, currentPositionRate)
  )
    .sort((left, right) => right.rate - left.rate)
    .slice(0, 3)

  return {
    currentPosition,
    currentPositionRate,
    candidates,
    meta: market.meta
  }
}
