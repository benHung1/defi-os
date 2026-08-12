import type {
  OpportunityType,
  RateType,
  YieldOpportunity,
  YieldResponseMeta
} from './yield'

/**
 * User's current USDC allocation identity.
 * Domain fields only — not provider provenance (sourcePoolId).
 */
export interface UsdcCurrentPosition {
  asset: 'USDC'
  protocol: string
  product: string
  opportunityType: OpportunityType
  chain: string
  amount: number
}

/**
 * Market-observed rate for the current position product when present in the Market Universe.
 * Factual observation only — not a recommendation input.
 */
export interface UsdcCurrentPositionRate {
  rate: number
  rateType: RateType
}

export interface UsdcDecisionCandidateResponse {
  currentPosition: UsdcCurrentPosition
  currentPositionRate: UsdcCurrentPositionRate | null
  candidates: YieldOpportunity[]
  meta: YieldResponseMeta
}
