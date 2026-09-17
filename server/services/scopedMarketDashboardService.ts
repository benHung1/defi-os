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
