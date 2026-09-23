import type { PortfolioAsset, PortfolioPosition, PortfolioResponse } from '../../shared/types/portfolio.ts'

export interface PortfolioInputs {
  balances: { assets: PortfolioAsset[], warnings: string[] }
  protocolPositions: { positions: PortfolioPosition[], warnings: string[] }
  prices: Record<string, number>
  priceLookupFailed?: boolean
}

export function buildPortfolioResponse (address: string, inputs: PortfolioInputs): PortfolioResponse {
  const { balances, protocolPositions, prices, priceLookupFailed = false } = inputs
  const warnings = [...balances.warnings, ...protocolPositions.warnings]
  const assets = balances.assets.map((asset) => {
    const priceUsd = prices[asset.symbol] ?? null
    return { ...asset, priceUsd, valueUsd: priceUsd === null ? null : asset.amount * priceUsd }
  })
  const positions = protocolPositions.positions.map((position) => {
    const price = prices[position.asset]
    return { ...position, valueUsd: price === undefined ? position.valueUsd : position.amount * price }
  })
  const missingPriceSymbols = new Set([
    ...assets.filter(asset => asset.valueUsd === null).map(asset => asset.symbol),
    ...positions.filter(position => position.valueUsd === null).map(position => position.asset)
  ])
  if (priceLookupFailed) warnings.push('USD prices unavailable')
  else if (missingPriceSymbols.size > 0) warnings.push(`USD prices unavailable for ${[...missingPriceSymbols].join(', ')}`)

  const hasIncompleteBalances = balances.warnings.length > 0
  const hasPositionWarnings = protocolPositions.warnings.length > 0
  const hasUnavailablePositions = protocolPositions.warnings.some(warning => /positions? unavailable|position unavailable|not verified/i.test(warning))
  const hasIncompletePrices = priceLookupFailed || missingPriceSymbols.size > 0
  const pricedValues = assets.flatMap(asset => asset.valueUsd === null ? [] : [asset.valueUsd])
  const positionValues = positions.flatMap(position => position.valueUsd === null ? [] : [
    position.kind === 'BORROW' ? -position.valueUsd : position.valueUsd
  ])
  const totalUsd = !hasIncompleteBalances && !hasUnavailablePositions && !hasIncompletePrices
    ? [...pricedValues, ...positionValues].reduce((sum, value) => sum + value, 0)
    : null
  const assetSymbols = new Set([...assets.map(asset => asset.symbol), ...positions.map(position => position.asset)])
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
      positionSource: 'Protocol contracts; official registries and APIs for discovery or valuation metadata with onchain balance verification',
      priceSource: 'DefiLlama Coins API',
      partial: warnings.length > 0,
      warnings,
      coverage: {
        balances: hasIncompleteBalances ? 'PARTIAL' : 'COMPLETE',
        positions: hasPositionWarnings ? 'PARTIAL' : 'COMPLETE',
        prices: hasIncompletePrices ? 'PARTIAL' : 'COMPLETE'
      }
    }
  }
}
