import { fetchAaveScopedMarket, type SupportedMarketAsset } from '../providers/aave/scopedMarkets'
import type { UsdcMarketDashboardResponse, YieldOpportunity } from '../types/yield'
import { resolveFreshnessStatus } from '../types/yield'
import { getUsdcMarketDashboard } from './usdcMarketDashboardService'

export type SupportedMarketChain = 'ethereum' | 'base' | 'arbitrum'

const CHAINS: Record<SupportedMarketChain, { id: number, label: string, market: string }> = {
  ethereum: { id: 1, label: 'Ethereum', market: 'AaveV3Ethereum' },
  base: { id: 8453, label: 'Base', market: 'AaveV3Base' },
  arbitrum: { id: 42161, label: 'Arbitrum', market: 'AaveV3Arbitrum' }
}

const SUPPORTED_COMBINATIONS: Record<SupportedMarketChain, SupportedMarketAsset[]> = {
  ethereum: ['USDC', 'USDT', 'ETH', 'BTC'],
  base: ['USDC', 'ETH', 'BTC'],
  arbitrum: ['USDC', 'USDT', 'ETH', 'BTC']
}

export function isSupportedCombination (chain: SupportedMarketChain, asset: SupportedMarketAsset): boolean {
  return SUPPORTED_COMBINATIONS[chain].includes(asset)
}

export async function getMultiScopedMarketDashboard (
  chains: SupportedMarketChain[],
  assets: SupportedMarketAsset[],
  options: { forceRefresh?: boolean, limit?: number } = {}
): Promise<UsdcMarketDashboardResponse> {
  const combinations = chains.flatMap(chain => assets
    .filter(asset => isSupportedCombination(chain, asset))
    .map(asset => ({ chain, asset })))
  if (combinations.length === 0) throw new Error('No supported market combinations were selected.')
  if (combinations.length === 1) {
    const combination = combinations[0]!
    return getScopedMarketDashboard(combination.chain, combination.asset, options)
  }

  const results = await Promise.allSettled(combinations.map(({ chain, asset }) =>
    getScopedMarketDashboard(chain, asset, { ...options, limit: 20 })))
  const successful = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : [])
  if (successful.length === 0) throw new Error('Every selected market provider request failed.')

  const allData = successful.flatMap(result => result.data)
  const protocolTvls = new Map<string, number>()
  for (const item of allData) protocolTvls.set(item.protocol, (protocolTvls.get(item.protocol) ?? 0) + (item.tvlUsd ?? 0))
  const limit = options.limit ?? 5
  const rankedProtocols = [...protocolTvls.entries()].sort((left, right) => right[1] - left[1]).map(([protocol]) => protocol)
  const visibleProtocols = new Set(rankedProtocols.slice(0, limit))
  const fetchedAt = successful.map(result => result.meta.fetchedAt).sort().at(-1)!
  const providers = successful.flatMap(result => result.meta.providers)
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      const combination = combinations[index]!
      providers.push({ name: `${combination.chain}:${combination.asset}`, status: 'error' })
    }
  })

  return {
    data: allData.filter(item => visibleProtocols.has(item.protocol)),
    excluded: successful.flatMap(result => result.excluded),
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
        protocolCount: visibleProtocols.size,
        totalEligibleProtocols: rankedProtocols.length
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

  const chainConfig = CHAINS[chain]
  const { market, fetchedAt } = await fetchAaveScopedMarket(chainConfig.id, chainConfig.market, asset)
  const opportunity: YieldOpportunity = {
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
  }

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
        protocolCount: 1,
        totalEligibleProtocols: 1
      }
    }
  }
}
