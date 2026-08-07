import { ProviderError } from '../errors'

const DEFILLAMA_YIELDS_POOLS_URL = 'https://yields.llama.fi/pools'
const PROVIDER_NAME = 'DefiLlama'

export interface DefiLlamaYieldPool {
  pool: string
  project: string
  symbol: string
  chain: string
  apy: number
  tvlUsd: number | null
  exposure: string | null
  ilRisk: string | null
  stablecoin: boolean | null
  poolMeta: string | null
  underlyingTokens: string[]
}

export interface DefiLlamaYieldFetchResult {
  pools: DefiLlamaYieldPool[]
  fetchedAt: string
}

function isRecord (value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readOptionalNumber (value: unknown): number | null {
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null
  }
  return value
}

function readRequiredNumber (value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ProviderError(PROVIDER_NAME, `Invalid pool field "${field}": expected finite number`)
  }
  return value
}

function readRequiredString (value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ProviderError(PROVIDER_NAME, `Invalid pool field "${field}": expected non-empty string`)
  }
  return value
}

function readOptionalString (value: unknown): string | null {
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value !== 'string') {
    return null
  }
  return value
}

function readOptionalBoolean (value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value
  }
  return null
}

function readUnderlyingTokens (value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  const tokens: string[] = []
  for (const entry of value) {
    if (typeof entry !== 'string') {
      continue
    }
    const trimmed = entry.trim()
    if (trimmed === '') {
      continue
    }
    tokens.push(trimmed)
  }
  return tokens
}

function parseDefiLlamaYieldPool (value: unknown): DefiLlamaYieldPool {
  if (!isRecord(value)) {
    throw new ProviderError(PROVIDER_NAME, 'Invalid pool entry: expected object')
  }

  return {
    pool: readRequiredString(value.pool, 'pool'),
    project: readRequiredString(value.project, 'project'),
    symbol: readRequiredString(value.symbol, 'symbol'),
    chain: readRequiredString(value.chain, 'chain'),
    apy: readRequiredNumber(value.apy, 'apy'),
    tvlUsd: readOptionalNumber(value.tvlUsd),
    exposure: readOptionalString(value.exposure),
    ilRisk: readOptionalString(value.ilRisk),
    stablecoin: readOptionalBoolean(value.stablecoin),
    poolMeta: readOptionalString(value.poolMeta),
    underlyingTokens: readUnderlyingTokens(value.underlyingTokens)
  }
}

function parseDefiLlamaPoolsResponse (payload: unknown): DefiLlamaYieldPool[] {
  if (!isRecord(payload)) {
    throw new ProviderError(PROVIDER_NAME, 'Invalid upstream response: expected object')
  }

  if (payload.status !== 'success') {
    throw new ProviderError(
      PROVIDER_NAME,
      `Unexpected upstream status: ${String(payload.status ?? 'missing')}`
    )
  }

  if (!Array.isArray(payload.data)) {
    throw new ProviderError(PROVIDER_NAME, 'Invalid upstream response: data must be an array')
  }

  return payload.data.map(parseDefiLlamaYieldPool)
}

export async function fetchDefiLlamaYieldPools (): Promise<DefiLlamaYieldFetchResult> {
  const fetchedAt = new Date().toISOString()

  let response: Response
  try {
    response = await fetch(DEFILLAMA_YIELDS_POOLS_URL, {
      headers: {
        Accept: 'application/json'
      }
    })
  } catch (error) {
    throw new ProviderError(PROVIDER_NAME, 'Failed to reach DefiLlama yields API', { cause: error })
  }

  if (!response.ok) {
    throw new ProviderError(
      PROVIDER_NAME,
      `DefiLlama yields API returned HTTP ${response.status}`
    )
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch (error) {
    throw new ProviderError(PROVIDER_NAME, 'DefiLlama yields API returned invalid JSON', { cause: error })
  }

  const pools = parseDefiLlamaPoolsResponse(payload)

  return {
    pools,
    fetchedAt
  }
}
