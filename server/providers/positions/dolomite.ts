import { readErc4626Position } from './erc4626.ts'
import type { ProtocolPositionAdapter } from './types.ts'

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9eb0ce3606eb48'
const DOLOMITE_DUSDC_ADDRESS = '0x444868B6e8079ac2c55eea115250f92C2b2c4D14'

export const dolomitePositionAdapter: ProtocolPositionAdapter = {
  name: 'Dolomite',
  async getPositions (address) {
    const position = await readErc4626Position(address, {
      protocol: 'Dolomite',
      product: 'Dolomite Ethereum USDC',
      vaultAddress: DOLOMITE_DUSDC_ADDRESS,
      asset: 'USDC',
      assetAddress: USDC_ADDRESS,
      assetDecimals: 6
    })
    return { positions: position ? [position] : [], warnings: [] }
  }
}
