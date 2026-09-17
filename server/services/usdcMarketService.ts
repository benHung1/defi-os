import { fetchDefiLlamaYieldPools } from '../providers/defillama/yields'
import { fetchMorphoEthereumUsdcVaults } from '../providers/morpho/vaults'
import { ProviderError } from '../providers/errors'
import type {
  ProviderFetchMeta,
  UsdcMarketResponse,
  YieldOpportunity
} from '../types/yield'
import {
  resolveAggregateFreshnessStatus,
  resolveFreshnessStatus
} from '../types/yield'
import { selectDefiLlamaUsdcOpportunities } from './market-selectors/defillamaUsdcSelectors'
import { selectMorphoUsdcOpportunities } from './market-selectors/morphoUsdcSelector'

export class MarketProvidersUnavailableError extends Error {
  constructor (message = 'All required USDC market providers failed.') {
    super(message)
    this.name = 'MarketProvidersUnavailableError'
  }
}

const MARKET_CACHE_TTL_MS = 10 * 60 * 1000
const MANUAL_REFRESH_COOLDOWN_MS = 30 * 1000

let cachedMarket: UsdcMarketResponse | null = null
let marketFetchPromise: Promise<UsdcMarketResponse> | null = null
let lastFetchStartedAt = 0

type ProviderOutcome =
  | {
    name: string
    status: 'ok'
    fetchedAt: string
    opportunities: YieldOpportunity[]
  }
  | {
    name: string
    status: 'error'
    detail: string
  }

function compareMarketOrder (left: YieldOpportunity, right: YieldOpportunity): number {
  const tvlDiff = (right.tvlUsd ?? -1) - (left.tvlUsd ?? -1)
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

  const chainCompare = left.chain.localeCompare(right.chain)
  if (chainCompare !== 0) {
    return chainCompare
  }

  return (left.sourcePoolId ?? '').localeCompare(right.sourcePoolId ?? '')
}

async function fetchDefiLlamaOutcome (): Promise<ProviderOutcome> {
  try {
    const { pools, fetchedAt } = await fetchDefiLlamaYieldPools()
    return {
      name: 'DefiLlama',
      status: 'ok',
      fetchedAt,
      opportunities: selectDefiLlamaUsdcOpportunities(pools, fetchedAt)
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown DefiLlama failure'
    console.error('[usdcMarketService] DefiLlama provider failed', {
      detail,
      provider: error instanceof ProviderError ? error.provider : 'DefiLlama'
    })
    return {
      name: 'DefiLlama',
      status: 'error',
      detail
    }
  }
}

async function fetchMorphoOutcome (): Promise<ProviderOutcome> {
  try {
    const { vaults, fetchedAt } = await fetchMorphoEthereumUsdcVaults()
    return {
      name: 'Morpho',
      status: 'ok',
      fetchedAt,
      opportunities: selectMorphoUsdcOpportunities(vaults, fetchedAt)
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown Morpho failure'
    console.error('[usdcMarketService] Morpho provider failed', {
      detail,
      provider: error instanceof ProviderError ? error.provider : 'Morpho'
    })
    return {
      name: 'Morpho',
      status: 'error',
      detail
    }
  }
}

function toProviderFetchMeta (outcome: ProviderOutcome): ProviderFetchMeta {
  if (outcome.status === 'ok') {
    return {
      name: outcome.name,
      status: 'ok',
      fetchedAt: outcome.fetchedAt
    }
  }

  return {
    name: outcome.name,
    status: 'error'
  }
}

/**
 * Trusted USDC Market Dataset.
 * Orchestrates required providers, tolerates partial failure, and applies
 * neutral Market ordering (tvlUsd desc + identity tie-breakers).
 * No Top-20 cap — Market Universe and Dashboard Top 20 are separate concepts.
 */
async function fetchUsdcMarketOpportunities (): Promise<UsdcMarketResponse> {
  const [defiLlama, morpho] = await Promise.all([
    fetchDefiLlamaOutcome(),
    fetchMorphoOutcome()
  ])

  const outcomes = [defiLlama, morpho]
  const successful = outcomes.filter(
    (outcome): outcome is Extract<ProviderOutcome, { status: 'ok' }> => outcome.status === 'ok'
  )

  if (successful.length === 0) {
    throw new MarketProvidersUnavailableError()
  }

  const data = successful
    .flatMap(outcome => outcome.opportunities)
    .sort(compareMarketOrder)

  const aggregate = resolveAggregateFreshnessStatus(
    successful.map(outcome => outcome.fetchedAt)
  )

  return {
    data,
    meta: {
      fetchedAt: aggregate.fetchedAt,
      status: aggregate.status,
      providers: outcomes.map(toProviderFetchMeta)
    }
  }
}

function cacheAgeMs (market: UsdcMarketResponse, now: number): number {
  const fetchedMs = Date.parse(market.meta.fetchedAt)
  return Number.isNaN(fetchedMs) ? Number.POSITIVE_INFINITY : now - fetchedMs
}

function presentMarket (
  market: UsdcMarketResponse,
  servedFromCache: boolean,
  refreshCooldownSeconds?: number,
  cacheFallback = false
): UsdcMarketResponse {
  return {
    data: market.data,
    meta: {
      ...market.meta,
      status: resolveFreshnessStatus(market.meta.fetchedAt),
      servedFromCache,
      cacheFallback,
      ...(refreshCooldownSeconds === undefined ? {} : { refreshCooldownSeconds })
    }
  }
}

export interface UsdcMarketRequestOptions {
  forceRefresh?: boolean
}

/**
 * Shared Market snapshot for Dashboard and Decision consumers.
 * Normal reads reuse a 10-minute snapshot. Manual refreshes bypass the TTL,
 * with a short server-side cooldown to protect large upstream requests.
 */
export async function getUsdcMarketOpportunities (
  options: UsdcMarketRequestOptions = {}
): Promise<UsdcMarketResponse> {
  const now = Date.now()

  if (options.forceRefresh && cachedMarket) {
    const cooldownRemaining = MANUAL_REFRESH_COOLDOWN_MS - (now - lastFetchStartedAt)
    if (cooldownRemaining > 0) {
      return presentMarket(cachedMarket, true, Math.ceil(cooldownRemaining / 1000))
    }
  }

  if (!options.forceRefresh && cachedMarket && cacheAgeMs(cachedMarket, now) < MARKET_CACHE_TTL_MS) {
    return presentMarket(cachedMarket, true)
  }

  if (!marketFetchPromise) {
    lastFetchStartedAt = now
    marketFetchPromise = fetchUsdcMarketOpportunities()
      .then((market) => {
        cachedMarket = market
        return market
      })
      .finally(() => {
        marketFetchPromise = null
      })
  }

  try {
    const market = await marketFetchPromise
    return presentMarket(market, false)
  } catch (error) {
    if (cachedMarket) {
      return presentMarket(cachedMarket, true, undefined, true)
    }
    throw error
  }
}
