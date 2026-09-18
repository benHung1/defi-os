import { Interface } from 'ethers'
import type { PortfolioPosition } from '../../../shared/types/portfolio'
import { ethCallData, formatTokenUnits } from '../ethereum/client'
import type { ProtocolPositionAdapter } from './types'

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9eb0ce3606eb48'
const paretoInterface = new Interface([
  'function balanceOf(address account) view returns (uint256)',
  'function virtualPrice(address tranche) view returns (uint256)'
])

const PARETO_VAULTS = [
  { product: 'FalconX', vault: '0x433D5B175148dA32Ffe1e1A37a939E1b7e79be4d', lpToken: '0xC26A6Fa2C37b38E549a4a1807543801Db684f99C', strategy: '0x17E9Ab2992dfecBe779a06A92a6cDB9fE6aEeEf3' },
  { product: 'RockawayX', vault: '0x9cF358aff79DeA96070A85F00c0AC79569970Ec3', lpToken: '0xEC6a70F62a83418c7fb238182eD2865F80491a8B', strategy: '0x3Fc0265E92EeafED0cCd9F8621764Ce0981882cE' },
  { product: 'Bastion', vault: '0x4462eD748B8F7985A4aC6b538Dfc105Fce2dD165', lpToken: '0xC49b4ECc14aa31Ef0AD077EdcF53faB4201b724c', strategy: '0x06975bB418EFFB0029fe278A6fA15B92bb97496F' }
]

async function readParetoUint (target: string, functionName: string, args: unknown[]): Promise<bigint> {
  const result = await ethCallData(target, paretoInterface.encodeFunctionData(functionName, args))
  return paretoInterface.decodeFunctionResult(functionName, result)[0] as bigint
}

async function readParetoPosition (address: string, config: typeof PARETO_VAULTS[number]): Promise<PortfolioPosition | null> {
  const [shares, pendingAssets] = await Promise.all([
    readParetoUint(config.lpToken, 'balanceOf', [address]),
    readParetoUint(config.strategy, 'balanceOf', [address])
  ])
  if (shares === BigInt(0) && pendingAssets === BigInt(0)) return null

  // Pareto's tranche tokens use 18 decimals. virtualPrice accepts the tranche
  // token address and returns its value in underlying USDC units.
  const activeAssets = shares === BigInt(0)
    ? BigInt(0)
    : shares * await readParetoUint(config.vault, 'virtualPrice', [config.lpToken]) / (BigInt(10) ** BigInt(18))
  // IdleCreditVault receipts represent requested underlying 1:1 at 6 decimals.
  const assets = activeAssets + pendingAssets

  return {
    protocol: 'Pareto',
    product: config.product,
    kind: 'VAULT',
    chain: 'Ethereum',
    asset: 'USDC',
    amount: formatTokenUnits(assets, 6),
    valueUsd: null,
    rate: null,
    rateType: null,
    contractAddress: config.lpToken,
    assetAddress: USDC_ADDRESS,
    verification: 'ONCHAIN',
    verifiedAt: new Date().toISOString()
  }
}

export const paretoPositionAdapter: ProtocolPositionAdapter = {
  name: 'Pareto',
  async getPositions (address) {
    const settled = await Promise.allSettled(PARETO_VAULTS.map(config => readParetoPosition(address, config)))
    const positions = settled.flatMap(result => result.status === 'fulfilled' && result.value ? [result.value] : [])
    const failedCount = settled.filter(result => result.status === 'rejected').length
    return {
      positions,
      warnings: failedCount > 0 ? [`Pareto positions unavailable for ${failedCount} products`] : []
    }
  }
}
