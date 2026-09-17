import { ProviderError } from '../errors'

const AAVE_GRAPHQL_URL = 'https://api.v3.aave.com/graphql'
const PROVIDER_NAME = 'Aave'

export type SupportedMarketAsset = 'USDC' | 'USDT' | 'ETH' | 'BTC'

const SYMBOL_ALIASES: Record<SupportedMarketAsset, string[]> = {
  USDC: ['USDC'],
  USDT: ['USDT', 'USD₮0'],
  ETH: ['WETH'],
  BTC: ['WBTC', 'cbBTC', 'tBTC', 'LBTC']
}

export interface AaveScopedMarketRecord {
  marketAddress: string
  reserveAddress: string
  reserveSymbol: string
  apy: number
  tvlUsd: number
}

function isRecord (value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function finiteNumber (value: unknown, field: string): number {
  const number = typeof value === 'string' || typeof value === 'number' ? Number(value) : Number.NaN
  if (!Number.isFinite(number)) throw new ProviderError(PROVIDER_NAME, `Invalid Aave field "${field}"`)
  return number
}

function parseMarket (payload: unknown, chainId: number, marketName: string, asset: SupportedMarketAsset): AaveScopedMarketRecord {
  if (!isRecord(payload) || !isRecord(payload.data) || !Array.isArray(payload.data.markets)) {
    throw new ProviderError(PROVIDER_NAME, 'Aave GraphQL response is missing markets')
  }
  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    throw new ProviderError(PROVIDER_NAME, 'Aave GraphQL returned errors')
  }
  const market = payload.data.markets.find(candidate =>
    isRecord(candidate) && candidate.name === marketName
    && isRecord(candidate.chain) && candidate.chain.chainId === chainId
  )
  if (!isRecord(market) || typeof market.address !== 'string' || !Array.isArray(market.reserves)) {
    throw new ProviderError(PROVIDER_NAME, `Aave market ${marketName} is unavailable`)
  }

  const candidates = market.reserves.filter((candidate): candidate is Record<string, unknown> =>
    isRecord(candidate) && isRecord(candidate.underlyingToken)
    && typeof candidate.underlyingToken.symbol === 'string'
    && SYMBOL_ALIASES[asset].includes(candidate.underlyingToken.symbol)
    && isRecord(candidate.supplyInfo) && isRecord(candidate.supplyInfo.apy)
    && isRecord(candidate.size)
  )
  const reserve = candidates.sort((left, right) =>
    finiteNumber((right.size as Record<string, unknown>).usd, 'size.usd')
    - finiteNumber((left.size as Record<string, unknown>).usd, 'size.usd')
  )[0]
  if (!reserve || !isRecord(reserve.underlyingToken) || typeof reserve.underlyingToken.address !== 'string' || typeof reserve.underlyingToken.symbol !== 'string') {
    throw new ProviderError(PROVIDER_NAME, `Aave ${asset} reserve is unavailable on chain ${chainId}`)
  }
  if (!isRecord(reserve.supplyInfo) || !isRecord(reserve.supplyInfo.apy) || !isRecord(reserve.size)) {
    throw new ProviderError(PROVIDER_NAME, `Aave ${asset} market data is incomplete on chain ${chainId}`)
  }

  return {
    marketAddress: market.address,
    reserveAddress: reserve.underlyingToken.address,
    reserveSymbol: reserve.underlyingToken.symbol,
    apy: finiteNumber(reserve.supplyInfo.apy.formatted, 'supplyInfo.apy.formatted'),
    tvlUsd: finiteNumber(reserve.size.usd, 'size.usd')
  }
}

export async function fetchAaveScopedMarket (chainId: number, marketName: string, asset: SupportedMarketAsset): Promise<{
  market: AaveScopedMarketRecord
  fetchedAt: string
}> {
  const query = `query ScopedMarket { markets(request: { chainIds: [${chainId}] }) { name address chain { chainId } reserves { underlyingToken { address symbol } supplyInfo { apy { formatted } } size { usd } } } }`
  let response: Response
  try {
    response = await fetch(AAVE_GRAPHQL_URL, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(12_000)
    })
  } catch (error) {
    throw new ProviderError(PROVIDER_NAME, 'Failed to reach Aave GraphQL API', { cause: error })
  }
  if (!response.ok) throw new ProviderError(PROVIDER_NAME, `Aave GraphQL API returned HTTP ${response.status}`)
  const payload = await response.json() as unknown
  return { market: parseMarket(payload, chainId, marketName, asset), fetchedAt: new Date().toISOString() }
}
