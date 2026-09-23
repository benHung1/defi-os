import type { SupportedMarketAsset } from './providers/aave/scopedMarkets'

export type MarketChainGroup = 'L1' | 'L2' | 'OTHER'

export interface MarketChainDefinition {
  key: string
  label: string
  symbol: string
  group: MarketChainGroup
  chainId: number
  aaveMarket: string
  assets: SupportedMarketAsset[]
}

export const MARKET_ASSETS: SupportedMarketAsset[] = ['USDC', 'USDT', 'ETH', 'BTC']

export const MARKET_CHAINS = [
  { key: 'ethereum', label: 'Ethereum', symbol: 'Ξ', group: 'L1', chainId: 1, aaveMarket: 'AaveV3Ethereum', assets: ['USDC', 'USDT', 'ETH', 'BTC'] },
  { key: 'bnb', label: 'BNB Chain', symbol: 'B', group: 'L1', chainId: 56, aaveMarket: 'AaveV3BNB', assets: ['USDC', 'USDT', 'ETH', 'BTC'] },
  { key: 'avalanche', label: 'Avalanche', symbol: 'A', group: 'L1', chainId: 43114, aaveMarket: 'AaveV3Avalanche', assets: ['USDC', 'USDT', 'ETH', 'BTC'] },
  { key: 'sonic', label: 'Sonic', symbol: 'S', group: 'L1', chainId: 146, aaveMarket: 'AaveV3Sonic', assets: ['USDC', 'ETH'] },
  { key: 'optimism', label: 'Optimism', symbol: 'O', group: 'L2', chainId: 10, aaveMarket: 'AaveV3Optimism', assets: ['USDC', 'USDT', 'ETH', 'BTC'] },
  { key: 'arbitrum', label: 'Arbitrum', symbol: 'A', group: 'L2', chainId: 42161, aaveMarket: 'AaveV3Arbitrum', assets: ['USDC', 'USDT', 'ETH', 'BTC'] },
  { key: 'base', label: 'Base', symbol: 'B', group: 'L2', chainId: 8453, aaveMarket: 'AaveV3Base', assets: ['USDC', 'ETH', 'BTC'] },
  { key: 'linea', label: 'Linea', symbol: 'L', group: 'L2', chainId: 59144, aaveMarket: 'AaveV3Linea', assets: ['USDC', 'USDT', 'ETH', 'BTC'] },
  { key: 'scroll', label: 'Scroll', symbol: 'S', group: 'L2', chainId: 534352, aaveMarket: 'AaveV3Scroll', assets: ['USDC', 'ETH'] },
  { key: 'gnosis', label: 'Gnosis', symbol: 'G', group: 'OTHER', chainId: 100, aaveMarket: 'AaveV3Gnosis', assets: ['USDC', 'ETH'] },
  { key: 'polygon', label: 'Polygon PoS', symbol: 'P', group: 'OTHER', chainId: 137, aaveMarket: 'AaveV3Polygon', assets: ['USDC', 'USDT', 'ETH', 'BTC'] }
] as const satisfies readonly MarketChainDefinition[]

export type SupportedMarketChain = typeof MARKET_CHAINS[number]['key']

export function getMarketChain (key: SupportedMarketChain): MarketChainDefinition {
  return MARKET_CHAINS.find(chain => chain.key === key)!
}

export function isSupportedMarketChain (value: string): value is SupportedMarketChain {
  return MARKET_CHAINS.some(chain => chain.key === value)
}
