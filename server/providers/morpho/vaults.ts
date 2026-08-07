import { ProviderError } from '../errors'

const MORPHO_GRAPHQL_URL = 'https://api.morpho.org/graphql'
const PROVIDER_NAME = 'Morpho'
export const ETHEREUM_USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'

export type MorphoVaultVersion = 'V1' | 'V2'

export interface MorphoVaultRecord {
  version: MorphoVaultVersion
  address: string
  name: string
  listed: boolean
  assetAddress: string
  assetSymbol: string
  /**
   * Official Morpho netApy as decimal fraction (e.g. 0.033 = 3.3%).
   * Depositor-facing net APY; may include rewards when present.
   */
  netApy: number
  totalAssetsUsd: number
}

export interface MorphoVaultFetchResult {
  vaults: MorphoVaultRecord[]
  fetchedAt: string
}

function isRecord (value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readRequiredString (value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ProviderError(PROVIDER_NAME, `Invalid vault field "${field}": expected non-empty string`)
  }
  return value
}

function readRequiredBoolean (value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') {
    throw new ProviderError(PROVIDER_NAME, `Invalid vault field "${field}": expected boolean`)
  }
  return value
}

function readRequiredFiniteNumber (value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ProviderError(PROVIDER_NAME, `Invalid vault field "${field}": expected finite number`)
  }
  return value
}

function readAsset (value: unknown): { address: string, symbol: string } {
  if (!isRecord(value)) {
    throw new ProviderError(PROVIDER_NAME, 'Invalid vault field "asset": expected object')
  }
  return {
    address: readRequiredString(value.address, 'asset.address'),
    symbol: readRequiredString(value.symbol, 'asset.symbol')
  }
}

/**
 * GraphQL query for listed Ethereum USDC MetaMorpho V1 and V2 vaults.
 * netApy is the chosen depositor-facing rate field (decimal APY).
 *
 * Note: V1 `assetAddress_in` expects String; V2 expects Address.
 * We inline the known Ethereum USDC address to avoid conflicting variable types.
 */
export const MORPHO_ETHEREUM_USDC_VAULTS_QUERY = `
query EthereumUsdcVaults {
  vaults(
    first: 1000
    orderBy: TotalAssetsUsd
    orderDirection: Desc
    where: {
      chainId_in: [1]
      assetAddress_in: ["${ETHEREUM_USDC_ADDRESS}"]
      listed: true
    }
  ) {
    items {
      address
      name
      listed
      asset { address symbol }
      state {
        totalAssetsUsd
        netApy
      }
    }
  }
  vaultV2s(
    first: 1000
    orderBy: TotalAssetsUsd
    orderDirection: Desc
    where: {
      chainId_in: [1]
      assetAddress_in: ["${ETHEREUM_USDC_ADDRESS}"]
      listed: true
    }
  ) {
    items {
      address
      name
      listed
      asset { address symbol }
      totalAssetsUsd
      netApy
    }
  }
}
`

/**
 * Parse one V1 vault. Returns null when netApy / totalAssetsUsd cannot be read
 * reliably — callers omit that vault rather than fabricating rates.
 */
function tryParseV1Vault (value: unknown): MorphoVaultRecord | null {
  if (!isRecord(value)) {
    console.warn('[morpho] skipping invalid V1 vault entry: expected object')
    return null
  }
  if (!isRecord(value.state)) {
    console.warn('[morpho] skipping V1 vault: missing state object', {
      address: typeof value.address === 'string' ? value.address : undefined
    })
    return null
  }

  try {
    const asset = readAsset(value.asset)
    return {
      version: 'V1',
      address: readRequiredString(value.address, 'address'),
      name: readRequiredString(value.name, 'name'),
      listed: readRequiredBoolean(value.listed, 'listed'),
      assetAddress: asset.address,
      assetSymbol: asset.symbol,
      // Source semantics: official Morpho state.netApy (decimal depositor-facing net APY).
      netApy: readRequiredFiniteNumber(value.state.netApy, 'state.netApy'),
      totalAssetsUsd: readRequiredFiniteNumber(value.state.totalAssetsUsd, 'state.totalAssetsUsd')
    }
  } catch (error) {
    console.warn('[morpho] omitting V1 vault with unusable fields', {
      address: typeof value.address === 'string' ? value.address : undefined,
      detail: error instanceof Error ? error.message : 'unknown'
    })
    return null
  }
}

/**
 * Parse one V2 vault. Returns null when netApy / totalAssetsUsd cannot be read
 * reliably — callers omit that vault rather than fabricating rates.
 */
function tryParseV2Vault (value: unknown): MorphoVaultRecord | null {
  if (!isRecord(value)) {
    console.warn('[morpho] skipping invalid V2 vault entry: expected object')
    return null
  }

  try {
    const asset = readAsset(value.asset)
    return {
      version: 'V2',
      address: readRequiredString(value.address, 'address'),
      name: readRequiredString(value.name, 'name'),
      listed: readRequiredBoolean(value.listed, 'listed'),
      assetAddress: asset.address,
      assetSymbol: asset.symbol,
      // Source semantics: official Morpho vaultV2 netApy (decimal depositor-facing net APY).
      netApy: readRequiredFiniteNumber(value.netApy, 'netApy'),
      totalAssetsUsd: readRequiredFiniteNumber(value.totalAssetsUsd, 'totalAssetsUsd')
    }
  } catch (error) {
    console.warn('[morpho] omitting V2 vault with unusable fields', {
      address: typeof value.address === 'string' ? value.address : undefined,
      detail: error instanceof Error ? error.message : 'unknown'
    })
    return null
  }
}

function parseMorphoVaultsPayload (payload: unknown): MorphoVaultRecord[] {
  if (!isRecord(payload)) {
    throw new ProviderError(PROVIDER_NAME, 'Invalid Morpho response: expected object')
  }

  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    const first = payload.errors[0]
    const message = isRecord(first) && typeof first.message === 'string'
      ? first.message
      : 'Morpho GraphQL returned errors'
    throw new ProviderError(PROVIDER_NAME, message)
  }

  if (!isRecord(payload.data)) {
    throw new ProviderError(PROVIDER_NAME, 'Invalid Morpho response: missing data')
  }

  if (!isRecord(payload.data.vaults) || !Array.isArray(payload.data.vaults.items)) {
    throw new ProviderError(PROVIDER_NAME, 'Invalid Morpho response: vaults.items must be an array')
  }

  if (!isRecord(payload.data.vaultV2s) || !Array.isArray(payload.data.vaultV2s.items)) {
    throw new ProviderError(PROVIDER_NAME, 'Invalid Morpho response: vaultV2s.items must be an array')
  }

  const vaults: MorphoVaultRecord[] = []
  for (const item of payload.data.vaults.items) {
    const vault = tryParseV1Vault(item)
    if (vault) {
      vaults.push(vault)
    }
  }
  for (const item of payload.data.vaultV2s.items) {
    const vault = tryParseV2Vault(item)
    if (vault) {
      vaults.push(vault)
    }
  }
  return vaults
}

export async function fetchMorphoEthereumUsdcVaults (): Promise<MorphoVaultFetchResult> {
  const fetchedAt = new Date().toISOString()

  let response: Response
  try {
    response = await fetch(MORPHO_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: MORPHO_ETHEREUM_USDC_VAULTS_QUERY
      })
    })
  } catch (error) {
    throw new ProviderError(PROVIDER_NAME, 'Failed to reach Morpho GraphQL API', { cause: error })
  }

  if (!response.ok) {
    let detail = `Morpho GraphQL API returned HTTP ${response.status}`
    try {
      const errorPayload: unknown = await response.json()
      if (
        isRecord(errorPayload)
        && Array.isArray(errorPayload.errors)
        && errorPayload.errors.length > 0
      ) {
        const first = errorPayload.errors[0]
        if (isRecord(first) && typeof first.message === 'string') {
          detail = `${detail}: ${first.message}`
        }
      }
    } catch {
      // Keep HTTP status detail when error body is unreadable.
    }
    throw new ProviderError(PROVIDER_NAME, detail)
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch (error) {
    throw new ProviderError(PROVIDER_NAME, 'Morpho GraphQL API returned invalid JSON', { cause: error })
  }

  return {
    vaults: parseMorphoVaultsPayload(payload),
    fetchedAt
  }
}
