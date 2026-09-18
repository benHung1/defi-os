export type PortfolioAssetKind = 'NATIVE' | 'ERC20'
export type PortfolioPositionKind = 'SUPPLY' | 'BORROW' | 'COLLATERAL' | 'VAULT'
export type PortfolioRateType = 'APR' | 'APY'

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

export interface PortfolioPosition {
  protocol: string
  product: string
  kind: PortfolioPositionKind
  chain: string
  asset: string
  amount: number
  valueUsd: number | null
  rate: number | null
  rateType: PortfolioRateType | null
  contractAddress: string
  assetAddress?: string
  isCollateral?: boolean
  verification: 'ONCHAIN' | 'INDEXER_ONCHAIN_VERIFIED'
  verifiedAt: string
}

export interface PortfolioResponse {
  address: string
  chains: PortfolioChain[]
  positions: PortfolioPosition[]
  summary: {
    totalUsd: number | null
    assetCount: number
    protocolCount: number
    chainCount: number
  }
  meta: {
    fetchedAt: string
    balanceSource: string
    positionSource: string
    priceSource: string
    partial: boolean
    warnings: string[]
  }
}
