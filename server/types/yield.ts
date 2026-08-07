export type RateType = 'APR' | 'APY'

export type FreshnessStatus = 'fresh' | 'stale' | 'unavailable'

export interface YieldOpportunity {
  protocol: string
  asset: string
  chain: string
  rate: number
  rateType: RateType
  tvlUsd: number | null
  source: string
  sourceUrl?: string
  sourcePoolId?: string
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
