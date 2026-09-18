import { readErc4626Position } from './erc4626'
import type { ProtocolPositionAdapter } from './types'

const MAPLE_API_URL = 'https://api.maple.finance/v2/graphql'
const SYRUP_USDC_ADDRESS = '0x80ac24aA929eaF5013f6436cdA2a7ba190f5Cc0b'
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'

interface MaplePoolResponse {
  data?: {
    poolV2?: {
      monthlyApy?: unknown
    } | null
  }
}

async function fetchMapleMonthlyApy (): Promise<number> {
  const response = await fetch(MAPLE_API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      query: `query SyrupUsdcRate {
        poolV2(id: "${SYRUP_USDC_ADDRESS.toLowerCase()}") { monthlyApy }
      }`
    }),
    signal: AbortSignal.timeout(12_000)
  })
  if (!response.ok) throw new Error(`Maple API returned HTTP ${response.status}`)
  const payload = await response.json() as MaplePoolResponse
  const raw = Number(payload.data?.poolV2?.monthlyApy)
  if (!Number.isFinite(raw)) throw new Error('Maple API returned an invalid monthly APY')
  return raw / 1e28
}

export const maplePositionAdapter: ProtocolPositionAdapter = {
  name: 'Maple',
  async getPositions (address) {
    const position = await readErc4626Position(address, {
      protocol: 'Maple',
      product: 'Syrup USDC',
      vaultAddress: SYRUP_USDC_ADDRESS,
      asset: 'USDC',
      assetAddress: USDC_ADDRESS,
      assetDecimals: 6
    })
    if (!position) return { positions: [], warnings: [] }

    try {
      position.rate = await fetchMapleMonthlyApy()
      position.rateType = 'APY'
      return { positions: [position], warnings: [] }
    } catch {
      return { positions: [position], warnings: ['Maple rate unavailable'] }
    }
  }
}
