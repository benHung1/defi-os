export type RateType = 'APR' | 'APY'

export type FreshnessStatus = 'fresh' | 'stale' | 'unavailable'

export type OpportunityType =
  | 'LENDING_SUPPLY'
  | 'SAVINGS'
  | 'CURATED_VAULT'

/**
 * Whether DeFi OS can currently trust this provider observation enough to use it.
 * Not protocol safety, smart-contract risk, credit risk, or economic risk.
 */
export type DataQuality =
  | 'VERIFIED'
  | 'SUSPECT'

export interface ObservationDataQuality {
  dataQuality: DataQuality
  dataQualityReasons?: string[]
}

/**
 * MVP integrity guard: current APY vs provider 30-day mean.
 * Does not claim the pool is unsafe — only that the observation is suspect.
 */
export function evaluateObservationDataQuality (
  apy: number,
  apyMean30d: number | null
): ObservationDataQuality {
  if (
    apyMean30d !== null
    && Number.isFinite(apyMean30d)
    && apyMean30d > 0
    && Number.isFinite(apy)
    && apy >= 2 * apyMean30d
  ) {
    return {
      dataQuality: 'SUSPECT',
      dataQualityReasons: [
        "Current APY is more than 2× the provider's 30-day mean."
      ]
    }
  }

  return {
    dataQuality: 'VERIFIED'
  }
}

export interface YieldOpportunity {
  protocol: string
  product: string
  opportunityType: OpportunityType
  asset: string
  chain: string
  rate: number
  rateType: RateType
  tvlUsd: number | null
  source: string
  sourceUrl?: string
  sourcePoolId?: string
  /**
   * Whether DeFi OS can currently trust this provider observation enough to use it.
   * Not a protocol-safety or economic-risk label.
   */
  dataQuality: DataQuality
  dataQualityReasons?: string[]
  /**
   * Time DeFi OS fetched the provider response.
   * Not the upstream pool measurement / observation timestamp.
   */
  fetchedAt: string
}

export interface YieldResponseMeta {
  source: string
  /**
   * Time DeFi OS fetched the provider response.
   * FreshnessStatus below describes provider-fetch freshness only;
   * it does not prove the APY observation itself is fresh.
   */
  fetchedAt: string
  status: FreshnessStatus
}

export interface UsdcYieldResponse {
  data: YieldOpportunity[]
  meta: YieldResponseMeta
}

const FRESH_MS = 15 * 60 * 1000
const STALE_MS = 60 * 60 * 1000

export function resolveFreshnessStatus (fetchedAt: string, now = Date.now()): FreshnessStatus {
  const fetchedMs = Date.parse(fetchedAt)
  if (Number.isNaN(fetchedMs)) {
    return 'unavailable'
  }

  const age = now - fetchedMs
  if (age < FRESH_MS) {
    return 'fresh'
  }
  if (age <= STALE_MS) {
    return 'stale'
  }
  return 'unavailable'
}
