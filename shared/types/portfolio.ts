export type PortfolioAssetKind = 'NATIVE' | 'ERC20'

export interface PortfolioAsset {
  symbol: string
  name: string
  kind: PortfolioAssetKind
  chain: string
  amount: number
  priceUsd: number | null
  valueUsd: number | null
  contractAddress?: string
}

export interface PortfolioChain {
  chain: string
  chainId: number
  assets: PortfolioAsset[]
  totalUsd: number | null
}

export interface PortfolioResponse {
  address: string
  chains: PortfolioChain[]
  summary: {
    totalUsd: number | null
    assetCount: number
    protocolCount: number
    chainCount: number
  }
  meta: {
    fetchedAt: string
    balanceSource: string
    priceSource: string
    partial: boolean
    warnings: string[]
  }
}
