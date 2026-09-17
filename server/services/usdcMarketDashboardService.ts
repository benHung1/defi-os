import type {
  UsdcMarketDashboardResponse,
  YieldOpportunity
} from '../types/yield'
import { getUsdcMarketOpportunities } from './usdcMarketService'

/**
 * Presentation ceiling for the Market Dashboard UI.
 * 20 is a presentation ceiling, not an investment ranking or Top APY policy.
 */
const DASHBOARD_MAX_ITEMS = 20

/** Maximum Morpho curated vaults shown on the Dashboard. */
const MORPHO_DASHBOARD_LIMIT = 6
const MORPHO_PROTOCOL = 'Morpho Blue'

/**
 * Exact upstream-name family key for Morpho presentation deduplication.
 * Removes only a trailing " (V1)" / " (V2)" suffix, then lowercase + trim.
 * Does not merge distinct products such as Steakhouse vs Steakhouse Prime.
 */
export function morphoProductFamilyKey (product: string): string {
  return product
    .replace(/(?: \(V[12]\)| · Vault V[12])$/, '')
    .toLowerCase()
    .trim()
}

function tvlOrNegOne (opportunity: YieldOpportunity): number {
  return opportunity.tvlUsd ?? -1
}

function compareByTvlThenIdentity (
  left: YieldOpportunity,
  right: YieldOpportunity
): number {
  const tvlDiff = tvlOrNegOne(right) - tvlOrNegOne(left)
  if (tvlDiff !== 0) {
    return tvlDiff
  }

  const protocolCompare = left.protocol.localeCompare(right.protocol)
  if (protocolCompare !== 0) {
    return protocolCompare
  }

  const productCompare = left.product.localeCompare(right.product)
  if (productCompare !== 0) {
    return productCompare
  }

  return (left.sourcePoolId ?? '').localeCompare(right.sourcePoolId ?? '')
}

/**
 * Select up to MORPHO_DASHBOARD_LIMIT Morpho vaults:
 * TVL-desc first, then exact-name family dedupe (keep highest-TVL per family).
 */
export function selectMorphoDashboardOpportunities (
  opportunities: YieldOpportunity[]
): YieldOpportunity[] {
  const morpho = opportunities
    .filter(opportunity =>
      opportunity.protocol === MORPHO_PROTOCOL
      && opportunity.dataQuality === 'VERIFIED'
      && opportunity.opportunityType === 'CURATED_VAULT'
    )
    .sort(compareByTvlThenIdentity)

  const selected: YieldOpportunity[] = []
  const seenFamilies = new Set<string>()

  for (const opportunity of morpho) {
    const familyKey = morphoProductFamilyKey(opportunity.product)
    if (seenFamilies.has(familyKey)) {
      continue
    }
    seenFamilies.add(familyKey)
    selected.push(opportunity)
    if (selected.length >= MORPHO_DASHBOARD_LIMIT) {
      break
    }
  }

  return selected
}

function selectNonMorphoDashboardOpportunities (
  opportunities: YieldOpportunity[]
): YieldOpportunity[] {
  return opportunities.filter(opportunity =>
    opportunity.protocol !== MORPHO_PROTOCOL
    && opportunity.dataQuality === 'VERIFIED'
  )
}

/**
 * Build the Dashboard presentation set from a Market Universe snapshot.
 * Exported for deterministic verification of Morpho family selection.
 */
export function selectUsdcMarketDashboardOpportunities (
  opportunities: YieldOpportunity[]
): YieldOpportunity[] {
  const nonMorpho = selectNonMorphoDashboardOpportunities(opportunities)
  const morpho = selectMorphoDashboardOpportunities(opportunities)

  const combined = [...nonMorpho, ...morpho].sort(compareByTvlThenIdentity)

  // Presentation ceiling only — do not fill unused slots with extra Morpho vaults.
  if (combined.length > DASHBOARD_MAX_ITEMS) {
    return combined.slice(0, DASHBOARD_MAX_ITEMS)
  }

  return combined
}

/**
 * USDC Market Dashboard Dataset.
 * Presentation / selection layer over the complete Market Universe.
 * Does not fetch providers, alter DataQuality, or produce recommendations.
 */
export async function getUsdcMarketDashboard (
  options: { forceRefresh?: boolean, limit?: number } = {}
): Promise<UsdcMarketDashboardResponse> {
  const market = await getUsdcMarketOpportunities(options)
  const dashboardOpportunities = selectUsdcMarketDashboardOpportunities(market.data)
  const protocolTvls = new Map<string, number>()

  for (const opportunity of dashboardOpportunities) {
    protocolTvls.set(
      opportunity.protocol,
      (protocolTvls.get(opportunity.protocol) ?? 0) + (opportunity.tvlUsd ?? 0)
    )
  }

  const rankedProtocols = Array.from(protocolTvls.entries())
    .sort((left, right) => {
      const tvlDiff = right[1] - left[1]
      return tvlDiff !== 0 ? tvlDiff : left[0].localeCompare(right[0])
    })
  const limit = options.limit ?? 5
  const visibleProtocols = new Set(
    rankedProtocols.slice(0, limit).map(([protocol]) => protocol)
  )

  return {
    data: dashboardOpportunities.filter(opportunity => visibleProtocols.has(opportunity.protocol)),
    meta: {
      ...market.meta,
      ranking: {
        scope: 'SUPPORTED_ETHEREUM_USDC_PROTOCOLS',
        sort: 'tvl',
        limit,
        protocolCount: visibleProtocols.size,
        totalEligibleProtocols: rankedProtocols.length
      }
    }
  }
}
