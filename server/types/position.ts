import type { OpportunityType, YieldOpportunity, YieldResponseMeta } from './yield'

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

export interface UsdcDecisionCandidateResponse {
  currentPosition: UsdcCurrentPosition
  candidates: YieldOpportunity[]
  meta: YieldResponseMeta
}
