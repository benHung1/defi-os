import type { DefiLlamaYieldPool } from '../../providers/defillama/yields'
import type {
  OpportunityType,
  YieldOpportunity
} from '../../types/yield'
import { evaluateObservationDataQuality } from '../../types/yield'

const SOURCE_NAME = 'DefiLlama'
const SOURCE_URL = 'https://yields.llama.fi/pools'
const ASSET = 'USDC'
const ETHEREUM_CHAIN = 'Ethereum'
const ETHEREUM_USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'

/**
 * Special-purpose Aave poolMeta labels that are not the standard
 * Ethereum USDC lending-supply product.
 */
const AAVE_EXCLUDED_POOL_META = [
  'umbrella',
  'horizon',
  'prime',
  'plus',
  'staking',
  'safety'
]

function isLendingLikePool (pool: DefiLlamaYieldPool): boolean {
  return pool.exposure === 'single' && pool.ilRisk === 'no'
}

function isPlainUsdcSymbol (symbol: string): boolean {
  return symbol.toUpperCase() === 'USDC'
}

function hasVerifiedEthereumUsdcUnderlying (pool: DefiLlamaYieldPool): boolean {
  if (pool.chain !== ETHEREUM_CHAIN) {
    return false
  }

  const target = ETHEREUM_USDC_ADDRESS.toLowerCase()
  return pool.underlyingTokens.some(token => token.toLowerCase() === target)
}

function isBaseEthereumUsdcCandidate (pool: DefiLlamaYieldPool): boolean {
  return isLendingLikePool(pool)
    && isPlainUsdcSymbol(pool.symbol)
    && hasVerifiedEthereumUsdcUnderlying(pool)
}

function tvlOrNegOne (pool: DefiLlamaYieldPool): number {
  return pool.tvlUsd ?? -1
}

function preferHigherTvlThenPoolId (
  candidate: DefiLlamaYieldPool,
  existing: DefiLlamaYieldPool
): boolean {
  const candidateTvl = tvlOrNegOne(candidate)
  const existingTvl = tvlOrNegOne(existing)
  if (candidateTvl !== existingTvl) {
    return candidateTvl > existingTvl
  }
  return candidate.pool.localeCompare(existing.pool) < 0
}

function selectBestPool (
  pools: DefiLlamaYieldPool[],
  isMatch: (pool: DefiLlamaYieldPool) => boolean
): DefiLlamaYieldPool | null {
  let best: DefiLlamaYieldPool | null = null

  for (const pool of pools) {
    if (!isMatch(pool)) {
      continue
    }
    if (!best || preferHigherTvlThenPoolId(pool, best)) {
      best = pool
    }
  }

  return best
}

function isExcludedAavePoolMeta (poolMeta: string | null): boolean {
  if (poolMeta === null) {
    return false
  }

  const normalized = poolMeta.toLowerCase()
  return AAVE_EXCLUDED_POOL_META.some(label => normalized.includes(label))
}

/**
 * Standard Aave V3 Ethereum USDC lending supply.
 * Prefer unlabeled / Core markets; exclude Umbrella, Horizon, Prime, Plus, etc.
 */
export function selectAavePool (pools: DefiLlamaYieldPool[]): DefiLlamaYieldPool | null {
  return selectBestPool(pools, (pool) => {
    if (pool.project !== 'aave-v3') {
      return false
    }
    if (!isBaseEthereumUsdcCandidate(pool)) {
      return false
    }
    if (isExcludedAavePoolMeta(pool.poolMeta)) {
      return false
    }
    return true
  })
}

/**
 * Spark Savings USDC — not SparkLend supply.
 */
export function selectSparkPool (pools: DefiLlamaYieldPool[]): DefiLlamaYieldPool | null {
  return selectBestPool(pools, (pool) => {
    if (pool.project !== 'spark-savings') {
      return false
    }
    return isBaseEthereumUsdcCandidate(pool)
  })
}

/**
 * Fluid Lending USDC — exclude fluid-dex / fluid-lite.
 */
export function selectFluidPool (pools: DefiLlamaYieldPool[]): DefiLlamaYieldPool | null {
  return selectBestPool(pools, (pool) => {
    if (pool.project !== 'fluid-lending') {
      return false
    }
    return isBaseEthereumUsdcCandidate(pool)
  })
}

/**
 * Standard Compound V3 Ethereum USDC supply.
 * Qualifies by project/chain/underlying/exposure — not solely by expected pool UUID.
 * Excludes special/metadata variants (non-null poolMeta) and ETH-pool style symbols.
 */
export function selectCompoundV3Pool (pools: DefiLlamaYieldPool[]): DefiLlamaYieldPool | null {
  return selectBestPool(pools, (pool) => {
    if (pool.project !== 'compound-v3') {
      return false
    }
    if (!isBaseEthereumUsdcCandidate(pool)) {
      return false
    }
    // Standard product identity: unlabeled poolMeta only.
    if (pool.poolMeta !== null) {
      return false
    }
    return true
  })
}

function toMarketOpportunity (
  pool: DefiLlamaYieldPool,
  protocol: string,
  product: string,
  opportunityType: OpportunityType,
  fetchedAt: string
): YieldOpportunity | null {
  const quality = evaluateObservationDataQuality(pool.apy, pool.apyMean30d)

  // Market Service owns DataQuality policy: omit SUSPECT observations.
  if (quality.dataQuality !== 'VERIFIED') {
    console.warn('[defillamaUsdcSelectors] omitting SUSPECT opportunity', {
      protocol,
      product,
      sourcePoolId: pool.pool,
      apy: pool.apy,
      apyMean30d: pool.apyMean30d,
      dataQualityReasons: quality.dataQualityReasons
    })
    return null
  }

  return {
    protocol,
    product,
    opportunityType,
    asset: ASSET,
    chain: pool.chain,
    rate: pool.apy,
    rateType: 'APY',
    tvlUsd: pool.tvlUsd,
    source: SOURCE_NAME,
    sourceUrl: SOURCE_URL,
    sourcePoolId: pool.pool,
    dataQuality: quality.dataQuality,
    fetchedAt
  }
}

function pushIfVerified (
  opportunities: YieldOpportunity[],
  pool: DefiLlamaYieldPool | null,
  protocol: string,
  product: string,
  opportunityType: OpportunityType,
  fetchedAt: string
): void {
  if (!pool) {
    return
  }

  const opportunity = toMarketOpportunity(
    pool,
    protocol,
    product,
    opportunityType,
    fetchedAt
  )

  if (opportunity) {
    opportunities.push(opportunity)
  }
}

/**
 * Normalize DefiLlama-backed USDC Market opportunities for currently supported products.
 */
export function selectDefiLlamaUsdcOpportunities (
  pools: DefiLlamaYieldPool[],
  fetchedAt: string
): YieldOpportunity[] {
  const opportunities: YieldOpportunity[] = []

  pushIfVerified(
    opportunities,
    selectAavePool(pools),
    'Aave',
    'Aave V3 Ethereum USDC',
    'LENDING_SUPPLY',
    fetchedAt
  )

  pushIfVerified(
    opportunities,
    selectSparkPool(pools),
    'Spark',
    'Spark Savings USDC',
    'SAVINGS',
    fetchedAt
  )

  pushIfVerified(
    opportunities,
    selectFluidPool(pools),
    'Fluid',
    'Fluid Lending USDC',
    'LENDING_SUPPLY',
    fetchedAt
  )

  pushIfVerified(
    opportunities,
    selectCompoundV3Pool(pools),
    'Compound',
    'Compound V3 Ethereum USDC',
    'LENDING_SUPPLY',
    fetchedAt
  )

  return opportunities
}
