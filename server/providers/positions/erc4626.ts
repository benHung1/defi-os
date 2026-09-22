import { Interface } from 'ethers'
import type { PortfolioPosition } from '../../../shared/types/portfolio.ts'
import { ethCallData, formatTokenUnits } from '../ethereum/client.ts'

const vaultInterface = new Interface([
  'function balanceOf(address account) view returns (uint256)',
  'function convertToAssets(uint256 shares) view returns (uint256)'
])

export interface Erc4626PositionConfig {
  protocol: string
  product: string
  vaultAddress: string
  asset: string
  assetAddress: string
  assetDecimals: number
  rate?: number | null
  rateType?: 'APR' | 'APY' | null
}

async function readVaultUint (vaultAddress: string, functionName: string, args: unknown[]): Promise<bigint> {
  const data = vaultInterface.encodeFunctionData(functionName, args)
  const result = await ethCallData(vaultAddress, data)
  return vaultInterface.decodeFunctionResult(functionName, result)[0] as bigint
}

export async function readErc4626Position (
  address: string,
  config: Erc4626PositionConfig
): Promise<PortfolioPosition | null> {
  const shares = await readVaultUint(config.vaultAddress, 'balanceOf', [address])
  if (shares === BigInt(0)) return null

  const assets = await readVaultUint(config.vaultAddress, 'convertToAssets', [shares])
  return {
    protocol: config.protocol,
    product: config.product,
    kind: 'VAULT',
    chain: 'Ethereum',
    asset: config.asset,
    amount: formatTokenUnits(assets, config.assetDecimals),
    valueUsd: null,
    rate: config.rate ?? null,
    rateType: config.rateType ?? null,
    contractAddress: config.vaultAddress,
    assetAddress: config.assetAddress,
    verification: 'ONCHAIN',
    verifiedAt: new Date().toISOString()
  }
}
