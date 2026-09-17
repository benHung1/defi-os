import { ProviderError } from '../errors'

const PROVIDER_NAME = 'Fluid'
const FLUID_LEND_API_URL = 'https://api.fluid.instadapp.io/1/tokens'
const FUSDC_ADDRESS = '0x9Fb7b4477576Fe5B32be4C1843aFB1e55F251B33'

interface FluidTokenPayload {
  address?: unknown
  asset?: { symbol?: unknown, decimals?: unknown, price?: unknown }
  totalAssets?: unknown
  totalRate?: unknown
}
export interface FluidUsdcMarketRecord {
  address: string
  apr: number
  tvlUsd: number
}

function finiteNumber (value: unknown, field: string): number {
  const parsed = typeof value === 'string' || typeof value === 'number' ? Number(value) : Number.NaN
  if (!Number.isFinite(parsed)) {
    throw new ProviderError(PROVIDER_NAME, `Invalid Fluid field "${field}"`)
  }
  return parsed
}

export async function fetchFluidEthereumUsdcMarket (): Promise<{
  market: FluidUsdcMarketRecord
  fetchedAt: string
}> {
  let response: Response
  try {
    response = await fetch(FLUID_LEND_API_URL, { signal: AbortSignal.timeout(12_000) })
  } catch (error) {
    throw new ProviderError(PROVIDER_NAME, 'Failed to reach Fluid Lend API', { cause: error })
  }
  if (!response.ok) {
    throw new ProviderError(PROVIDER_NAME, `Fluid Lend API returned HTTP ${response.status}`)
  }

  const payload = await response.json() as { data?: FluidTokenPayload[] }
  const token = payload.data?.find(item =>
    typeof item.address === 'string'
    && item.address.toLowerCase() === FUSDC_ADDRESS.toLowerCase()
    && item.asset?.symbol === 'USDC'
  )
  if (!token) {
    throw new ProviderError(PROVIDER_NAME, 'Fluid Lend API did not return the Ethereum fUSDC market')
  }

  const decimals = finiteNumber(token.asset?.decimals, 'asset.decimals')
  const price = finiteNumber(token.asset?.price, 'asset.price')
  const totalAssets = finiteNumber(token.totalAssets, 'totalAssets')
  const totalRate = finiteNumber(token.totalRate, 'totalRate')

  return {
    market: {
      address: FUSDC_ADDRESS,
      // Fluid exposes annual lending rates in basis points (e.g. 469 = 4.69%).
      apr: totalRate / 100,
      tvlUsd: totalAssets / Math.pow(10, decimals) * price
    },
    fetchedAt: new Date().toISOString()
  }
}
