import { encodeUint256Argument, ethCall, formatTokenUnits } from '../ethereum/client.ts'
import { ProviderError } from '../errors.ts'

const PROVIDER_NAME = 'Compound'
const COMET_USDC = '0xc3d688B66703497DAA19211EEdff47f25384cdc3' as const
const SECONDS_PER_YEAR = 31_536_000
const RATE_SCALE = 1e18

const GET_UTILIZATION_SELECTOR = '0x7eb71131'
const GET_SUPPLY_RATE_SELECTOR = '0xd955759d'
const TOTAL_SUPPLY_SELECTOR = '0x18160ddd'

export interface CompoundUsdcMarketRecord {
  address: string
  apr: number
  tvlUsd: number
}

export async function fetchCompoundEthereumUsdcMarket (): Promise<{
  market: CompoundUsdcMarketRecord
  fetchedAt: string
}> {
  try {
    const utilization = await ethCall(COMET_USDC, GET_UTILIZATION_SELECTOR)
    const [supplyRate, totalSupply] = await Promise.all([
      ethCall(COMET_USDC, `${GET_SUPPLY_RATE_SELECTOR}${encodeUint256Argument(utilization)}`),
      ethCall(COMET_USDC, TOTAL_SUPPLY_SELECTOR)
    ])
    const apr = Number(supplyRate) / RATE_SCALE * SECONDS_PER_YEAR * 100
    const tvlUsd = formatTokenUnits(totalSupply, 6)

    if (!Number.isFinite(apr) || apr < 0 || !Number.isFinite(tvlUsd) || tvlUsd < 0) {
      throw new Error('Compound contract returned invalid market values')
    }

    return {
      market: { address: COMET_USDC, apr, tvlUsd },
      fetchedAt: new Date().toISOString()
    }
  } catch (error) {
    throw new ProviderError(PROVIDER_NAME, 'Failed to read Compound V3 USDC market on Ethereum', { cause: error })
  }
}
