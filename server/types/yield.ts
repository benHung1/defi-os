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
 * DefiLlama observation semantics only — do not apply to Morpho official data.
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

export type ProviderFetchStatus = 'ok' | 'error'

export interface ProviderFetchMeta {
  name: string
  status: ProviderFetchStatus
  /**
   * Time DeFi OS fetched this provider response (when status is ok).
   * Not an upstream pool measurement timestamp.
   */
  fetchedAt?: string
}

export interface YieldResponseMeta {
  /**
   * Latest successful DeFi OS provider-fetch timestamp among providers that succeeded.
   * Not an upstream pool measurement timestamp.
   */
  fetchedAt: string
  /**
   * Freshness derived from successful provider-fetch timestamps only.
   */
  status: FreshnessStatus
  /**
   * Aggregate dataset availability per provider.
   * Per-opportunity provenance remains on each YieldOpportunity.source.
   */
  providers: ProviderFetchMeta[]
}

export interface UsdcMarketResponse {
  data: YieldOpportunity[]
  meta: YieldResponseMeta
}

/**
 * Presentation subset of the Market Universe for the homepage Market Dashboard.
 * Same opportunity + meta shapes as the full Market response.
 */
export interface UsdcMarketDashboardResponse {
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

/**
 * Aggregate freshness from successful provider fetch timestamps.
 * Uses the latest successful fetch time.
 */
export function resolveAggregateFreshnessStatus (
  successfulFetchedAt: string[],
  now = Date.now()
): { fetchedAt: string, status: FreshnessStatus } {
  const first = successfulFetchedAt[0]
  if (first === undefined) {
    return {
      fetchedAt: new Date(now).toISOString(),
      status: 'unavailable'
    }
  }

  let latest: string = first
  let latestMs = Date.parse(latest)

  for (const candidate of successfulFetchedAt.slice(1)) {
    const candidateMs = Date.parse(candidate)
    if (!Number.isNaN(candidateMs) && (Number.isNaN(latestMs) || candidateMs > latestMs)) {
      latest = candidate
      latestMs = candidateMs
    }
  }

  return {
    fetchedAt: latest,
    status: resolveFreshnessStatus(latest, now)
  }
}
