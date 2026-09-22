import { Interface } from 'ethers'
import { ethCallData, formatTokenUnits } from '../ethereum/client.ts'
import { fetchSparkUsdcVault } from '../spark/vault.ts'
import type { ProtocolPositionAdapter } from './types.ts'

const SPARK_USDC_VAULT = '0x28B3a8fb53B741A8Fd78c0fb9A6B2393d896a43d'
const vaultInterface = new Interface([
  'function balanceOf(address account) view returns (uint256)',
  'function convertToAssets(uint256 shares) view returns (uint256)'
])

async function callUint (functionName: string, args: unknown[]): Promise<bigint> {
  const data = vaultInterface.encodeFunctionData(functionName, args)
  const result = await ethCallData(SPARK_USDC_VAULT, data)
  return vaultInterface.decodeFunctionResult(functionName, result)[0] as bigint
}

export const sparkSavingsPositionAdapter: ProtocolPositionAdapter = {
  name: 'Spark Savings',
  async getPositions (address) {
    const [shares, market] = await Promise.all([
      callUint('balanceOf', [address]),
      fetchSparkUsdcVault()
    ])
    if (shares === BigInt(0)) return { positions: [], warnings: [] }

    const assets = await callUint('convertToAssets', [shares])
    return {
      positions: [{
        protocol: 'Spark',
        product: 'Spark Savings USDC',
        kind: 'VAULT',
        chain: 'Ethereum',
        asset: 'USDC',
        amount: formatTokenUnits(assets, 6),
        valueUsd: null,
        rate: market.vault.apy,
        rateType: 'APY',
        contractAddress: SPARK_USDC_VAULT,
        assetAddress: '0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        verification: 'ONCHAIN',
        verifiedAt: new Date().toISOString()
      }],
      warnings: []
    }
  }
}
