import { fetchAaveScopedMarket, type SupportedMarketAsset } from '../providers/aave/scopedMarkets'
import { fetchDefiLlamaYieldPools } from '../providers/defillama/yields'
import { getMarketChain, type SupportedMarketChain } from '../marketRegistry'
import { attachPositionSupport } from '../productRegistry'
import type { UsdcMarketDashboardResponse, YieldOpportunity } from '../types/yield'
import { resolveFreshnessStatus } from '../types/yield'
import { getUsdcMarketDashboard } from './usdcMarketDashboardService'
import { selectDefiLlamaCandidateProducts } from './market-selectors/defillamaCandidateSelector'

const MAX_ELIGIBLE_PRODUCTS = 100

export function isSupportedCombination (chain: SupportedMarketChain, asset: SupportedMarketAsset): boolean {
  return getMarketChain(chain).assets.includes(asset)
}

export async function getMultiScopedMarketDashboard (
  chains: SupportedMarketChain[],
  assets: SupportedMarketAsset[],
  options: { forceRefresh?: boolean, limit?: number, query?: string } = {}
): Promise<UsdcMarketDashboardResponse> {
  const combinations = chains.flatMap(chain => assets
    .filter(asset => isSupportedCombination(chain, asset))
    .map(asset => ({ chain, asset })))
  if (combinations.length === 0) throw new Error('No supported market combinations were selected.')
  const discoveryPromise = fetchDefiLlamaYieldPools().then(
    discovery => discovery,
    () => null
  )
  const results = await Promise.allSettled(combinations.map(({ chain, asset }) =>
    getScopedMarketDashboard(chain, asset, { ...options, limit: 20 })))
  const successful = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : [])
  if (successful.length === 0) throw new Error('Every selected market provider request failed.')

  const officialData = successful.flatMap(result => result.data)
  let discoveryData: YieldOpportunity[] = []
  let discoveryExcluded: UsdcMarketDashboardResponse['excluded'] = []
  let discoveryFetchedAt: string | undefined
  let discoveryFailed = false
  try {
    const discovery = await discoveryPromise
    if (!discovery) {
      discoveryFailed = true
    } else {
      const selected = selectDefiLlamaCandidateProducts(discovery.pools, chains, assets, discovery.fetchedAt)
      const officialProtocols = new Set(officialData.map(item => item.protocol.toLocaleLowerCase()))
      discoveryData = selected.opportunities.filter(item => !officialProtocols.has(item.protocol.toLocaleLowerCase()))
      discoveryExcluded = selected.excluded
      discoveryFetchedAt = discovery.fetchedAt
    }
  } catch {
    discoveryFailed = true
  }

  const query = options.query?.trim().toLocaleLowerCase()
  const allData = [...officialData, ...discoveryData]
    .map(attachPositionSupport)
    .filter(item => item.positionReadable === true)
    .filter(item => !query || [
    item.protocol,
    item.product,
    item.chain,
    item.asset,
    item.source,
    item.sourcePoolId
    ].some(value => value?.toLocaleLowerCase().includes(query)))
  const limit = options.limit ?? 5
  const rankedProducts = [...allData]
    .sort((left, right) => (right.tvlUsd ?? 0) - (left.tvlUsd ?? 0))
    .slice(0, MAX_ELIGIBLE_PRODUCTS)
  const visibleProducts = rankedProducts.slice(0, limit)
  const fetchedAt = successful.map(result => result.meta.fetchedAt).sort().at(-1)!
  const providers = successful.flatMap(result => result.meta.providers)
  providers.push(discoveryFailed
    ? { name: 'DefiLlama discovery', status: 'error' }
    : { name: 'DefiLlama discovery', status: 'ok', fetchedAt: discoveryFetchedAt })
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      const combination = combinations[index]!
      providers.push({ name: `${combination.chain}:${combination.asset}`, status: 'error' })
    }
  })

  return {
    data: visibleProducts,
    excluded: [...successful.flatMap(result => result.excluded), ...discoveryExcluded],
    meta: {
      fetchedAt,
      status: resolveFreshnessStatus(fetchedAt),
      providers,
      servedFromCache: successful.every(result => result.meta.servedFromCache === true),
      cacheFallback: successful.some(result => result.meta.cacheFallback === true),
      ranking: {
        scope: 'SUPPORTED_MARKET_PROTOCOLS',
        sort: 'tvl',
        limit,
        productCount: visibleProducts.length,
        totalEligibleProducts: rankedProducts.length
      }
    }
  }
}

export async function getScopedMarketDashboard (
  chain: SupportedMarketChain,
  asset: SupportedMarketAsset,
  options: { forceRefresh?: boolean, limit?: number } = {}
): Promise<UsdcMarketDashboardResponse> {
  if (chain === 'ethereum' && asset === 'USDC') return getUsdcMarketDashboard(options)

  const chainConfig = getMarketChain(chain)
  const { market, fetchedAt } = await fetchAaveScopedMarket(chainConfig.chainId, chainConfig.aaveMarket, asset, options.forceRefresh)
  const opportunity: YieldOpportunity = attachPositionSupport({
    protocol: 'Aave',
    product: `Aave V3 ${chainConfig.label} ${market.reserveSymbol}`,
    opportunityType: 'LENDING_SUPPLY',
    asset,
    chain: chainConfig.label,
    rate: market.apy,
    rateType: 'APY',
    tvlUsd: market.tvlUsd,
    source: 'Aave',
    sourceKind: 'OFFICIAL_API',
    productUrl: 'https://app.aave.com/',
    sourceUrl: 'https://api.v3.aave.com/graphql',
    sourcePoolId: `${market.marketAddress}:${market.reserveAddress}`,
    dataQuality: 'VERIFIED',
    fetchedAt
  })

  return {
    data: [opportunity],
    excluded: [],
    meta: {
      fetchedAt,
      status: resolveFreshnessStatus(fetchedAt),
      providers: [{ name: 'Aave', status: 'ok', fetchedAt }],
      servedFromCache: false,
      ranking: {
        scope: 'SUPPORTED_MARKET_PROTOCOLS',
        sort: 'tvl',
        limit: options.limit ?? 5,
        productCount: 1,
        totalEligibleProducts: 1
      }
    }
  }
}
