import { getUsdPrices } from '../providers/defillama/prices'
import { getEthereumPortfolioBalances } from '../providers/ethereum/portfolio'
import { getEthereumProtocolPositions } from '../providers/positions'
import { buildPortfolioResponse } from './portfolioBuilder'

export async function getPortfolio (address: string) {
  const [balances, protocolPositions] = await Promise.all([
    getEthereumPortfolioBalances(address),
    getEthereumProtocolPositions(address)
  ])
  let prices: Record<string, number> = {}
  let priceLookupFailed = false

  try {
    prices = await getUsdPrices([
      ...balances.assets.map(asset => asset.symbol),
      ...protocolPositions.positions.map(position => position.asset)
    ])
  } catch {
    priceLookupFailed = true
  }

  return buildPortfolioResponse(address, { balances, protocolPositions, prices, priceLookupFailed })
}
