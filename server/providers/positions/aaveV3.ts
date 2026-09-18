import { Interface } from 'ethers'
import { ethCallData, formatTokenUnits } from '../ethereum/client'
import type { PortfolioPosition } from '../../../shared/types/portfolio'
import type { ProtocolPositionAdapter, ProtocolPositionResult } from './types'

const RAY = 1e27
const SECONDS_PER_YEAR = 31_536_000
const TRACKED_SYMBOLS = new Set(['USDC', 'USDT', 'WETH', 'WBTC'])

const dataProviderInterface = new Interface([
  'function getAllReservesTokens() view returns (tuple(string symbol,address tokenAddress)[])',
  'function getUserReserveData(address asset,address user) view returns (uint256 currentATokenBalance,uint256 currentStableDebt,uint256 currentVariableDebt,uint256 principalStableDebt,uint256 scaledVariableDebt,uint256 stableBorrowRate,uint256 liquidityRate,uint40 stableRateLastUpdated,bool usageAsCollateralEnabled)'
])
const erc20Interface = new Interface(['function decimals() view returns (uint8)'])

interface AaveV3AdapterConfig {
  name: string
  product: string
  dataProvider: string
}

function rayAprToApy (rayRate: bigint): number {
  const ratePerSecond = Number(rayRate) / RAY / SECONDS_PER_YEAR
  return (Math.pow(1 + ratePerSecond, SECONDS_PER_YEAR) - 1) * 100
}

async function callDecoded (contract: string, functionName: string, args: unknown[] = []) {
  const calldata = dataProviderInterface.encodeFunctionData(functionName, args)
  const result = await ethCallData(contract, calldata)
  return dataProviderInterface.decodeFunctionResult(functionName, result)
}

async function readDecimals (token: string): Promise<number> {
  const data = erc20Interface.encodeFunctionData('decimals')
  const result = await ethCallData(token, data)
  return Number(erc20Interface.decodeFunctionResult('decimals', result)[0])
}

export function createAaveV3PositionAdapter (config: AaveV3AdapterConfig): ProtocolPositionAdapter {
  return {
    name: config.name,
    async getPositions (address: string): Promise<ProtocolPositionResult> {
      const verifiedAt = new Date().toISOString()
      const reservesResult = await callDecoded(config.dataProvider, 'getAllReservesTokens')
      const reserves = (reservesResult[0] as Array<{ symbol: string, tokenAddress: string }>)
        .filter(reserve => TRACKED_SYMBOLS.has(reserve.symbol.toUpperCase()))

      const settled = await Promise.allSettled(reserves.map(async (reserve): Promise<PortfolioPosition[]> => {
        const [userData, decimals] = await Promise.all([
          callDecoded(config.dataProvider, 'getUserReserveData', [reserve.tokenAddress, address]),
          readDecimals(reserve.tokenAddress)
        ])
        const supplied = userData[0] as bigint
        const stableDebt = userData[1] as bigint
        const variableDebt = userData[2] as bigint
        const liquidityRate = userData[6] as bigint
        const isCollateral = userData[8] as boolean
        const symbol = reserve.symbol.toUpperCase()
        const positions: PortfolioPosition[] = []

        if (supplied > BigInt(0)) {
          positions.push({
            protocol: config.name,
            product: config.product,
            kind: 'SUPPLY',
            chain: 'Ethereum',
            asset: symbol,
            amount: formatTokenUnits(supplied, decimals),
            valueUsd: null,
            rate: rayAprToApy(liquidityRate),
            rateType: 'APY',
            contractAddress: config.dataProvider,
            assetAddress: reserve.tokenAddress,
            isCollateral,
            verification: 'ONCHAIN',
            verifiedAt
          })
        }

        const debt = stableDebt + variableDebt
        if (debt > BigInt(0)) {
          positions.push({
            protocol: config.name,
            product: config.product,
            kind: 'BORROW',
            chain: 'Ethereum',
            asset: symbol,
            amount: formatTokenUnits(debt, decimals),
            valueUsd: null,
            rate: null,
            rateType: null,
            contractAddress: config.dataProvider,
            assetAddress: reserve.tokenAddress,
            verification: 'ONCHAIN',
            verifiedAt
          })
        }
        return positions
      }))

      const warnings: string[] = []
      const positions = settled.flatMap((result, index) => {
        if (result.status === 'fulfilled') return result.value
        warnings.push(`${config.name} ${reserves[index]?.symbol ?? 'reserve'} position unavailable`)
        return []
      })
      return { positions, warnings }
    }
  }
}

export const aaveEthereumPositionAdapter = createAaveV3PositionAdapter({
  name: 'Aave',
  product: 'Aave V3 Ethereum Core',
  dataProvider: '0x0a16f2FCC0D44FaE41cc54e079281D84A363bECD'
})

export const sparkLendPositionAdapter = createAaveV3PositionAdapter({
  name: 'Spark',
  product: 'SparkLend Ethereum',
  dataProvider: '0xFc21d6d146E6086B8359705C8b28512a983db0cb'
})
