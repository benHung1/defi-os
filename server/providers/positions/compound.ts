import { Interface } from 'ethers'
import { ethCallData, formatTokenUnits } from '../ethereum/client'
import { fetchCompoundEthereumUsdcMarket } from '../compound/comet'
import type { PortfolioPosition } from '../../../shared/types/portfolio'
import type { ProtocolPositionAdapter } from './types'

const COMET_USDC = '0xc3d688B66703497DAA19211EEdff47f25384cdc3'
const COLLATERAL_ASSETS = [
  { symbol: 'WETH', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18 },
  { symbol: 'WBTC', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8 }
] as const

const cometInterface = new Interface([
  'function balanceOf(address account) view returns (uint256)',
  'function borrowBalanceOf(address account) view returns (uint256)',
  'function collateralBalanceOf(address account,address asset) view returns (uint128)'
])

async function readUint (functionName: string, args: unknown[]): Promise<bigint> {
  const data = cometInterface.encodeFunctionData(functionName, args)
  const result = await ethCallData(COMET_USDC, data)
  return cometInterface.decodeFunctionResult(functionName, result)[0] as bigint
}

export const compoundPositionAdapter: ProtocolPositionAdapter = {
  name: 'Compound',
  async getPositions (address) {
    const verifiedAt = new Date().toISOString()
    const [market, supply, borrow, ...collaterals] = await Promise.all([
      fetchCompoundEthereumUsdcMarket(),
      readUint('balanceOf', [address]),
      readUint('borrowBalanceOf', [address]),
      ...COLLATERAL_ASSETS.map(asset => readUint('collateralBalanceOf', [address, asset.address]))
    ])
    const positions: PortfolioPosition[] = []

    if (supply > BigInt(0)) {
      positions.push({
        protocol: 'Compound',
        product: 'Compound V3 Ethereum USDC',
        kind: 'SUPPLY',
        chain: 'Ethereum',
        asset: 'USDC',
        amount: formatTokenUnits(supply, 6),
        valueUsd: null,
        rate: market.market.apr,
        rateType: 'APR',
        contractAddress: COMET_USDC,
        assetAddress: '0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        verification: 'ONCHAIN',
        verifiedAt
      })
    }
    if (borrow > BigInt(0)) {
      positions.push({
        protocol: 'Compound',
        product: 'Compound V3 Ethereum USDC',
        kind: 'BORROW',
        chain: 'Ethereum',
        asset: 'USDC',
        amount: formatTokenUnits(borrow, 6),
        valueUsd: null,
        rate: null,
        rateType: null,
        contractAddress: COMET_USDC,
        assetAddress: '0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        verification: 'ONCHAIN',
        verifiedAt
      })
    }
    collaterals.forEach((balance, index) => {
      const asset = COLLATERAL_ASSETS[index]!
      if (balance === BigInt(0)) return
      positions.push({
        protocol: 'Compound',
        product: 'Compound V3 Ethereum USDC',
        kind: 'COLLATERAL',
        chain: 'Ethereum',
        asset: asset.symbol,
        amount: formatTokenUnits(balance, asset.decimals),
        valueUsd: null,
        rate: null,
        rateType: null,
        contractAddress: COMET_USDC,
        assetAddress: asset.address,
        isCollateral: true,
        verification: 'ONCHAIN',
        verifiedAt
      })
    })

    return { positions, warnings: [] }
  }
}
