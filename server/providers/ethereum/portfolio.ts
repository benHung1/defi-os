import { encodeAddressArgument, ethCall, ethGetBalance, formatTokenUnits } from './client'
import type { PortfolioAsset } from '../../../shared/types/portfolio'

const BALANCE_OF_SELECTOR = '70a08231'

const TRACKED_ASSETS = [
  { symbol: 'USDC', name: 'USD Coin', address: '0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', decimals: 6 },
  { symbol: 'USDT', name: 'Tether USD', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
  { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8 }
] as const

export interface EthereumPortfolioBalances {
  assets: PortfolioAsset[]
  warnings: string[]
}

export async function getEthereumPortfolioBalances (address: string): Promise<EthereumPortfolioBalances> {
  const requests = [
    ethGetBalance(address).then(value => ({
      symbol: 'ETH',
      name: 'Ether',
      kind: 'NATIVE' as const,
      chain: 'Ethereum',
      amount: formatTokenUnits(value, 18),
      priceUsd: null,
      valueUsd: null
    })),
    ...TRACKED_ASSETS.map(async (asset) => {
      const value = await ethCall(asset.address, `0x${BALANCE_OF_SELECTOR}${encodeAddressArgument(address)}`)
      return {
        symbol: asset.symbol,
        name: asset.name,
        kind: 'ERC20' as const,
        chain: 'Ethereum',
        amount: formatTokenUnits(value, asset.decimals),
        priceUsd: null,
        valueUsd: null,
        contractAddress: asset.address
      }
    })
  ]

  const settled = await Promise.allSettled(requests)
  const warnings: string[] = []
  const assets: PortfolioAsset[] = []

  settled.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      if (result.value.amount > 0) assets.push(result.value)
      return
    }
    const symbol = index === 0 ? 'ETH' : TRACKED_ASSETS[index - 1]?.symbol ?? 'unknown asset'
    warnings.push(`${symbol} balance unavailable`)
  })

  return { assets, warnings }
}
