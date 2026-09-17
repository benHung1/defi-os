import { ProviderError } from '../errors'

const AAVE_GRAPHQL_URL = 'https://api.v3.aave.com/graphql'
const PROVIDER_NAME = 'Aave'
const ETHEREUM_CHAIN_ID = 1
const CORE_MARKET_NAME = 'AaveV3Ethereum'
const ETHEREUM_USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'

const QUERY = `
query EthereumMarkets {
  markets(request: { chainIds: [${ETHEREUM_CHAIN_ID}] }) {
    name
    address
    chain { chainId }
    reserves {
      underlyingToken { address symbol }
      supplyInfo { apy { formatted } }
      size { usd }
    }
  }
}
`

export interface AaveUsdcMarketRecord {
  marketAddress: string
  apy: number
  tvlUsd: number
}

function isRecord (value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readFiniteNumber (value: unknown, field: string): number {
  const parsed = typeof value === 'string' ? Number(value) : value
  if (typeof parsed !== 'number' || !Number.isFinite(parsed)) {
    throw new ProviderError(PROVIDER_NAME, `Invalid Aave field "${field}"`)
  }
  return parsed
}

function parseCoreUsdcMarket (payload: unknown): AaveUsdcMarketRecord {
  if (!isRecord(payload)) {
    throw new ProviderError(PROVIDER_NAME, 'Invalid GraphQL response')
  }
  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    throw new ProviderError(PROVIDER_NAME, 'Aave GraphQL returned errors')
  }
  if (!isRecord(payload.data) || !Array.isArray(payload.data.markets)) {
    throw new ProviderError(PROVIDER_NAME, 'Aave GraphQL response is missing markets')
  }

  const market = payload.data.markets.find(candidate =>
    isRecord(candidate)
    && candidate.name === CORE_MARKET_NAME
    && isRecord(candidate.chain)
    && candidate.chain.chainId === ETHEREUM_CHAIN_ID
  )
  if (!isRecord(market) || typeof market.address !== 'string' || !Array.isArray(market.reserves)) {
    throw new ProviderError(PROVIDER_NAME, 'Aave Ethereum Core market is unavailable')
  }

  const reserve = market.reserves.find(candidate =>
    isRecord(candidate)
    && isRecord(candidate.underlyingToken)
    && typeof candidate.underlyingToken.address === 'string'
    && candidate.underlyingToken.address.toLowerCase() === ETHEREUM_USDC_ADDRESS.toLowerCase()
  )
  if (!isRecord(reserve) || !isRecord(reserve.supplyInfo) || !isRecord(reserve.size)) {
    throw new ProviderError(PROVIDER_NAME, 'Aave Ethereum Core USDC reserve is unavailable')
  }
  if (!isRecord(reserve.supplyInfo.apy)) {
    throw new ProviderError(PROVIDER_NAME, 'Aave USDC APY is unavailable')
  }

  return {
    marketAddress: market.address,
    apy: readFiniteNumber(reserve.supplyInfo.apy.formatted, 'supplyInfo.apy.formatted'),
    tvlUsd: readFiniteNumber(reserve.size.usd, 'size.usd')
  }
}

export async function fetchAaveEthereumUsdcMarket (): Promise<{
  market: AaveUsdcMarketRecord
  fetchedAt: string
}> {
  const fetchedAt = new Date().toISOString()
  let response: Response
  try {
    response = await fetch(AAVE_GRAPHQL_URL, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: QUERY })
    })
  } catch (error) {
    throw new ProviderError(PROVIDER_NAME, 'Failed to reach Aave GraphQL API', { cause: error })
  }

  if (!response.ok) {
    throw new ProviderError(PROVIDER_NAME, `Aave GraphQL API returned HTTP ${response.status}`)
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch (error) {
    throw new ProviderError(PROVIDER_NAME, 'Aave GraphQL returned invalid JSON', { cause: error })
  }

  return { market: parseCoreUsdcMarket(payload), fetchedAt }
}
