import type { DefiLlamaYieldPool } from '../providers/defillama/yields'
import { fetchDefiLlamaYieldPools } from '../providers/defillama/yields'
import type { YieldOpportunity, UsdcYieldResponse } from '../types/yield'
import { resolveFreshnessStatus } from '../types/yield'

type TargetProtocol = 'Spark' | 'Aave' | 'Morpho' | 'Fluid'

const SOURCE_NAME = 'DefiLlama'
const SOURCE_URL = 'https://yields.llama.fi/pools'
const ASSET = 'USDC'
const ETHEREUM_CHAIN = 'Ethereum'
const ETHEREUM_USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'

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

function matchTargetProtocol (project: string): TargetProtocol | null {
  if (project === 'sparklend' || project === 'spark-savings') {
    return 'Spark'
  }
  if (project === 'aave-v3' || project === 'aave-v4') {
    return 'Aave'
  }
  if (project === 'morpho-blue') {
    return 'Morpho'
  }
  if (project === 'fluid-lending') {
    return 'Fluid'
  }
  return null
}

function isTargetUsdcPool (pool: DefiLlamaYieldPool): boolean {
  return isLendingLikePool(pool) && hasVerifiedEthereumUsdcUnderlying(pool)
}

function toYieldOpportunity (
  pool: DefiLlamaYieldPool,
  protocol: TargetProtocol,
  fetchedAt: string
): YieldOpportunity {
  return {
    protocol,
    asset: ASSET,
    chain: pool.chain,
    rate: pool.apy,
    rateType: 'APY',
    tvlUsd: pool.tvlUsd,
    source: SOURCE_NAME,
    sourceUrl: SOURCE_URL,
    sourcePoolId: pool.pool,
    fetchedAt
  }
}

function isPreferredOver (
  candidate: YieldOpportunity,
  existing: YieldOpportunity,
  candidateIsPlainUsdc: boolean,
  existingIsPlainUsdc: boolean
): boolean {
  if (candidateIsPlainUsdc !== existingIsPlainUsdc) {
    return candidateIsPlainUsdc
  }

  const candidateTvl = candidate.tvlUsd ?? -1
  const existingTvl = existing.tvlUsd ?? -1
  if (candidateTvl !== existingTvl) {
    return candidateTvl > existingTvl
  }

  const candidatePoolId = candidate.sourcePoolId ?? ''
  const existingPoolId = existing.sourcePoolId ?? ''
  return candidatePoolId.localeCompare(existingPoolId) < 0
}

function selectBestPoolPerProtocol (
  pools: DefiLlamaYieldPool[],
  fetchedAt: string
): YieldOpportunity[] {
  const bestByProtocol = new Map<TargetProtocol, YieldOpportunity>()
  const plainUsdcByProtocol = new Map<TargetProtocol, boolean>()

  for (const pool of pools) {
    const protocol = matchTargetProtocol(pool.project)
    if (!protocol) {
      continue
    }
    if (!isTargetUsdcPool(pool)) {
      continue
    }

    const opportunity = toYieldOpportunity(pool, protocol, fetchedAt)
    const candidateIsPlainUsdc = isPlainUsdcSymbol(pool.symbol)
    const existing = bestByProtocol.get(protocol)

    if (!existing) {
      bestByProtocol.set(protocol, opportunity)
      plainUsdcByProtocol.set(protocol, candidateIsPlainUsdc)
      continue
    }

    const existingIsPlainUsdc = plainUsdcByProtocol.get(protocol) === true
    if (isPreferredOver(opportunity, existing, candidateIsPlainUsdc, existingIsPlainUsdc)) {
      bestByProtocol.set(protocol, opportunity)
      plainUsdcByProtocol.set(protocol, candidateIsPlainUsdc)
    }
  }

  return [...bestByProtocol.values()].sort((left, right) =>
    left.protocol.localeCompare(right.protocol)
  )
}

export async function getUsdcYieldOpportunities (): Promise<UsdcYieldResponse> {
  const { pools, fetchedAt } = await fetchDefiLlamaYieldPools()
  const data = selectBestPoolPerProtocol(pools, fetchedAt)

  return {
    data,
    meta: {
      source: SOURCE_NAME,
      fetchedAt,
      status: resolveFreshnessStatus(fetchedAt)
    }
  }
}
