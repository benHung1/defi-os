import type { PortfolioResponse } from '../../shared/types/portfolio'

export const PORTFOLIO_DEMO_SCENARIO = 'aave-morpho-spark'
export const PORTFOLIO_PARTIAL_DEMO_SCENARIO = 'partial-coverage'
export const PORTFOLIO_DEMO_ADDRESS = '0x000000000000000000000000000000000000dEaD'
export type PortfolioDemoScenario = typeof PORTFOLIO_DEMO_SCENARIO | typeof PORTFOLIO_PARTIAL_DEMO_SCENARIO

export function getPortfolioDemoScenario (value: unknown): PortfolioDemoScenario | null {
  if (!import.meta.dev) return null
  return value === PORTFOLIO_DEMO_SCENARIO || value === PORTFOLIO_PARTIAL_DEMO_SCENARIO ? value : null
}

export function isPortfolioDemoScenario (value: unknown): boolean {
  return getPortfolioDemoScenario(value) !== null
}

export function createPortfolioDemo (
  fetchedAt = new Date().toISOString(),
  scenario: PortfolioDemoScenario = PORTFOLIO_DEMO_SCENARIO
): PortfolioResponse {
  const portfolio: PortfolioResponse = {
    address: PORTFOLIO_DEMO_ADDRESS,
    chains: [{
      chain: 'Ethereum',
      chainId: 1,
      totalUsd: 5100,
      assets: [{
        symbol: 'USDC',
        name: 'USD Coin',
        kind: 'ERC20',
        chain: 'Ethereum',
        amount: 500,
        priceUsd: 1,
        valueUsd: 500,
        contractAddress: '0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
      }]
    }],
    positions: [
      {
        protocol: 'Aave',
        product: 'Aave V3 Ethereum Core',
        kind: 'SUPPLY',
        chain: 'Ethereum',
        asset: 'USDC',
        amount: 1000,
        valueUsd: 1000,
        rate: 3.65,
        rateType: 'APY',
        contractAddress: '0x0a16f2FCC0D44FaE41cc54e079281D84A363bECD',
        assetAddress: '0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        isCollateral: true,
        verification: 'ONCHAIN',
        verifiedAt: fetchedAt
      },
      {
        protocol: 'Morpho Blue',
        product: 'Steakhouse USDC',
        kind: 'VAULT',
        chain: 'Ethereum',
        asset: 'USDC',
        amount: 2100,
        valueUsd: 2100,
        rate: 5.1,
        rateType: 'APY',
        contractAddress: '0xBEEF01735c132Ada46AA9aA4c54623cAA92A64CB',
        assetAddress: '0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        verification: 'INDEXER_ONCHAIN_VERIFIED',
        verifiedAt: fetchedAt
      },
      {
        protocol: 'Spark',
        product: 'SparkLend Ethereum',
        kind: 'SUPPLY',
        chain: 'Ethereum',
        asset: 'USDC',
        amount: 1500,
        valueUsd: 1500,
        rate: 4.2,
        rateType: 'APY',
        contractAddress: '0xFc21d6d146E6086B8359705C8b28512a983db0cb',
        assetAddress: '0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        isCollateral: true,
        verification: 'ONCHAIN',
        verifiedAt: fetchedAt
      }
    ],
    summary: { totalUsd: 5100, assetCount: 1, protocolCount: 3, chainCount: 1 },
    meta: {
      fetchedAt,
      balanceSource: 'Development scenario fixture',
      positionSource: 'Development scenario fixture matching the production PortfolioResponse contract',
      priceSource: 'Development scenario fixture',
      partial: false,
      warnings: [],
      coverage: {
        balances: 'COMPLETE',
        positions: 'COMPLETE',
        prices: 'COMPLETE'
      }
    }
  }

  if (scenario === PORTFOLIO_PARTIAL_DEMO_SCENARIO) {
    portfolio.positions = portfolio.positions.filter(position => position.protocol !== 'Morpho Blue')
    portfolio.summary.totalUsd = null
    portfolio.summary.protocolCount = 2
    portfolio.chains[0]!.totalUsd = null
    portfolio.meta.partial = true
    portfolio.meta.warnings = ['Morpho Blue positions unavailable']
    portfolio.meta.coverage.positions = 'PARTIAL'
  }

  return portfolio
}
