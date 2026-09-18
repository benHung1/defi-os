import type { SupportedMarketAsset } from '../../providers/aave/scopedMarkets'
import type { DefiLlamaYieldPool } from '../../providers/defillama/yields'
import { getMarketChain, type SupportedMarketChain } from '../../marketRegistry'
import { DEFILLAMA_DISCOVERY_PRODUCTS, isRegisteredDiscoveryPool } from '../../productRegistry'
import type { ExcludedMarketObservation, YieldOpportunity } from '../../types/yield'
import { evaluateObservationDataQuality } from '../../types/yield'

const MIN_TVL_USD = 10_000_000
const MAX_CANDIDATE_PRODUCTS = 100
const SOURCE_URL = 'https://yields.llama.fi/pools'
const COMPLEX_PRODUCT_META = /\b(lp|leveraged|loop|carry)\b/i

const DEFILLAMA_CHAIN_NAMES: Partial<Record<SupportedMarketChain, string>> = {
  ethereum: 'Ethereum', bnb: 'BSC', avalanche: 'Avalanche', sonic: 'Sonic',
  optimism: 'Optimism', arbitrum: 'Arbitrum', base: 'Base', linea: 'Linea',
  scroll: 'Scroll', gnosis: 'Gnosis', polygon: 'Polygon'
}

const ASSET_SYMBOLS: Record<SupportedMarketAsset, string[]> = {
  USDC: ['USDC', 'USDC.E'],
  USDT: ['USDT', 'USDT.E', 'USDT0', 'USD₮0', 'USDT'],
  ETH: ['ETH', 'WETH', 'WETH.E'],
  BTC: ['WBTC', 'WBTC.E', 'CBBTC', 'TBTC', 'LBTC', 'BTC.B', 'BTCB']
}

function normalizedAsset (symbol: string, selected: Set<SupportedMarketAsset>): SupportedMarketAsset | null {
  const normalized = symbol.toUpperCase()
  return (Object.entries(ASSET_SYMBOLS) as Array<[SupportedMarketAsset, string[]]>)
    .find(([asset, symbols]) => selected.has(asset) && symbols.includes(normalized))?.[0] ?? null
}

export function selectDefiLlamaCandidateProducts (
  pools: DefiLlamaYieldPool[],
  chains: SupportedMarketChain[],
  assets: SupportedMarketAsset[],
  fetchedAt: string
): { opportunities: YieldOpportunity[], excluded: ExcludedMarketObservation[] } {
  const selectedAssets = new Set(assets)
  const selectedChains = new Map(chains.map(chain => [DEFILLAMA_CHAIN_NAMES[chain], chain]))
  const excluded: ExcludedMarketObservation[] = []
  const candidates: YieldOpportunity[] = []

  for (const pool of pools) {
    const project = DEFILLAMA_DISCOVERY_PRODUCTS[pool.project]
    const chainKey = selectedChains.get(pool.chain)
    const asset = normalizedAsset(pool.symbol, selectedAssets)
    if (!project || !isRegisteredDiscoveryPool(pool.project, pool.pool)
      || !chainKey || !asset || pool.exposure !== 'single' || pool.ilRisk !== 'no'
      || pool.tvlUsd === null || pool.tvlUsd < MIN_TVL_USD || pool.apy <= 0
      || (pool.poolMeta !== null && COMPLEX_PRODUCT_META.test(pool.poolMeta))) continue

    const quality = evaluateObservationDataQuality(pool.apy, pool.apyMean30d)
    const product = pool.poolMeta?.trim()
      ? `${pool.poolMeta.trim()} (${asset})`
      : `${project.protocol} ${getMarketChain(chainKey).label} ${asset}`
    const productUrl = `https://defillama.com/yields/pool/${encodeURIComponent(pool.pool)}`
    if (quality.dataQuality !== 'VERIFIED' && pool.apyMean30d !== null) {
      excluded.push({
        protocol: project.protocol, product, chain: pool.chain, asset,
        reasonCode: 'APY_DEVIATES_FROM_30D_MEAN',
        reason: '目前 APY 達近 30 日平均的 2 倍以上，暫不納入排名。',
        currentRate: pool.apy, referenceRate: pool.apyMean30d, rateType: 'APY',
        source: 'DefiLlama', sourceKind: 'THIRD_PARTY_AGGREGATOR', productUrl,
        sourcePoolId: pool.pool
      })
      continue
    }
    candidates.push({
      protocol: project.protocol, product, opportunityType: project.type,
      asset, chain: getMarketChain(chainKey).label, rate: pool.apy, rateType: 'APY',
      tvlUsd: pool.tvlUsd, source: 'DefiLlama', sourceKind: 'THIRD_PARTY_AGGREGATOR',
      productUrl, sourceUrl: SOURCE_URL, sourcePoolId: pool.pool,
      dataQuality: 'VERIFIED', fetchedAt
    })
  }

  const identities = new Set<string>()
  const opportunities = candidates.sort((left, right) => (right.tvlUsd ?? 0) - (left.tvlUsd ?? 0))
    .filter((candidate) => {
      const identity = `${candidate.protocol}:${candidate.chain}:${candidate.asset}:${candidate.product}`
      if (identities.has(identity)) return false
      identities.add(identity)
      return true
    })
    .slice(0, MAX_CANDIDATE_PRODUCTS)

  return { opportunities, excluded }
}
