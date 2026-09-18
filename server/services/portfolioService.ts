import { getUsdPrices } from '../providers/defillama/prices'
import { getEthereumPortfolioBalances } from '../providers/ethereum/portfolio'
import { getEthereumProtocolPositions } from '../providers/positions'
import type { PortfolioResponse } from '../../shared/types/portfolio'

export async function getPortfolio (address: string): Promise<PortfolioResponse> {
  const [balances, protocolPositions] = await Promise.all([
    getEthereumPortfolioBalances(address),
    getEthereumProtocolPositions(address)
  ])
  const warnings = [...balances.warnings, ...protocolPositions.warnings]
  let prices: Record<string, number> = {}

  try {
    prices = await getUsdPrices([
      ...balances.assets.map(asset => asset.symbol),
      ...protocolPositions.positions.map(position => position.asset)
    ])
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
  const positions = protocolPositions.positions.map((position) => {
    const price = prices[position.asset]
    return {
      ...position,
      valueUsd: price === undefined ? position.valueUsd : position.amount * price
    }
  })
  const hasIncompleteBalances = warnings.some(warning => warning.includes('balance unavailable'))
  const hasIncompletePositions = warnings.some(warning => warning.includes('position'))
  const positionValues = positions.flatMap(position => position.valueUsd === null ? [] : [
    position.kind === 'BORROW' ? -position.valueUsd : position.valueUsd
  ])
  const totalUsd = !hasIncompleteBalances && !hasIncompletePositions && pricedValues.length === assets.length && positionValues.length === positions.length
    ? [...pricedValues, ...positionValues].reduce((sum, value) => sum + value, 0)
    : null
  const assetSymbols = new Set([
    ...assets.map(asset => asset.symbol),
    ...positions.map(position => position.asset)
  ])
  const protocols = new Set(positions.map(position => position.protocol))

  return {
    address,
    chains: [{ chain: 'Ethereum', chainId: 1, assets, totalUsd }],
    positions,
    summary: {
      totalUsd,
      assetCount: assetSymbols.size,
      protocolCount: protocols.size,
      chainCount: assets.length > 0 || positions.length > 0 ? 1 : 0
    },
    meta: {
      fetchedAt: new Date().toISOString(),
      balanceSource: 'Ethereum JSON-RPC',
      positionSource: 'Protocol contracts; Morpho discovery via official indexer with onchain verification',
      priceSource: 'DefiLlama Coins API',
      partial: warnings.length > 0,
      warnings
    }
  }
}
