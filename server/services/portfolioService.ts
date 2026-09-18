import { getUsdPrices } from '../providers/defillama/prices'
import { getEthereumPortfolioBalances } from '../providers/ethereum/portfolio'
import type { PortfolioResponse } from '../../shared/types/portfolio'

export async function getPortfolio (address: string): Promise<PortfolioResponse> {
  const balances = await getEthereumPortfolioBalances(address)
  const warnings = [...balances.warnings]
  let prices: Record<string, number> = {}

  try {
    prices = await getUsdPrices(balances.assets.map(asset => asset.symbol))
  } catch {
    warnings.push('USD prices unavailable')
  }

  const assets = balances.assets.map((asset) => {
    const priceUsd = prices[asset.symbol] ?? null
    return {
      ...asset,
      priceUsd,
      valueUsd: priceUsd === null ? null : asset.amount * priceUsd
    }
  })
  const pricedValues = assets.flatMap(asset => asset.valueUsd === null ? [] : [asset.valueUsd])
  const hasIncompleteBalances = warnings.some(warning => warning.includes('balance unavailable'))
  const totalUsd = !hasIncompleteBalances && pricedValues.length === assets.length
    ? pricedValues.reduce((sum, value) => sum + value, 0)
    : null

  return {
    address,
    chains: [{ chain: 'Ethereum', chainId: 1, assets, totalUsd }],
    summary: {
      totalUsd,
      assetCount: assets.length,
      protocolCount: 0,
      chainCount: assets.length > 0 ? 1 : 0
    },
    meta: {
      fetchedAt: new Date().toISOString(),
      balanceSource: 'Ethereum JSON-RPC',
      priceSource: 'DefiLlama Coins API',
      partial: warnings.length > 0,
      warnings
    }
  }
}
