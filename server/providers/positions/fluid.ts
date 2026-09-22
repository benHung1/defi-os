import { fetchFluidEthereumUsdcMarket } from '../fluid/lending.ts'
import { readErc4626Position } from './erc4626.ts'
import type { ProtocolPositionAdapter } from './types.ts'

const FUSDC_ADDRESS = '0x9Fb7b4477576Fe5B32be4C1843aFB1e55F251B33'
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'

export const fluidPositionAdapter: ProtocolPositionAdapter = {
  name: 'Fluid',
  async getPositions (address) {
    const position = await readErc4626Position(address, {
      protocol: 'Fluid',
      product: 'Fluid Lending USDC',
      vaultAddress: FUSDC_ADDRESS,
      asset: 'USDC',
      assetAddress: USDC_ADDRESS,
      assetDecimals: 6
    })
    if (!position) return { positions: [], warnings: [] }

    try {
      const { market } = await fetchFluidEthereumUsdcMarket()
      position.rate = market.apr
      position.rateType = 'APR'
      return { positions: [position], warnings: [] }
    } catch {
      return { positions: [position], warnings: ['Fluid rate unavailable'] }
    }
  }
}
