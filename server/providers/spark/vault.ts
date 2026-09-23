import { ethCall, formatTokenUnits } from '../ethereum/client.ts'
import { ProviderError } from '../errors.ts'

const PROVIDER_NAME = 'Spark'
const SPARK_USDC_VAULT = '0x28B3a8fb53B741A8Fd78c0fb9A6B2393d896a43d' as const
const SECONDS_PER_YEAR = 31_536_000
const RAY = 1e27

const VSR_SELECTOR = '0x1e7b14d3'
const TOTAL_ASSETS_SELECTOR = '0x01e1d114'

export interface SparkUsdcVaultRecord {
  address: string
  apy: number
  tvlUsd: number
}

export async function fetchSparkUsdcVault (): Promise<{
  vault: SparkUsdcVaultRecord
  fetchedAt: string
}> {
  try {
    const [vsr, totalAssets] = await Promise.all([
      ethCall(SPARK_USDC_VAULT, VSR_SELECTOR),
      ethCall(SPARK_USDC_VAULT, TOTAL_ASSETS_SELECTOR)
    ])
    const perSecondFactor = Number(vsr) / RAY
    const apy = (Math.pow(perSecondFactor, SECONDS_PER_YEAR) - 1) * 100
    const tvlUsd = formatTokenUnits(totalAssets, 6)

    if (!Number.isFinite(apy) || apy < 0 || !Number.isFinite(tvlUsd) || tvlUsd < 0) {
      throw new Error('Spark contract returned invalid market values')
    }

    return {
      vault: { address: SPARK_USDC_VAULT, apy, tvlUsd },
      fetchedAt: new Date().toISOString()
    }
  } catch (error) {
    throw new ProviderError(PROVIDER_NAME, 'Failed to read Spark USDC Vault on Ethereum', { cause: error })
  }
}
