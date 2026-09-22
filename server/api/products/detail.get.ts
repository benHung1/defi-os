import type { SupportedMarketAsset } from '../../providers/aave/scopedMarkets'
import { MARKET_ASSETS, MARKET_CHAINS, type SupportedMarketChain } from '../../marketRegistry'
import { getMultiScopedMarketDashboard } from '../../services/scopedMarketDashboardService'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const protocol = String(query.protocol ?? '').trim()
  const product = String(query.product ?? '').trim()
  const chainLabel = String(query.chain ?? '').trim()
  const asset = String(query.asset ?? '').trim().toUpperCase()
  const sourcePoolId = String(query.sourcePoolId ?? '').trim()

  if (!protocol || !product || !chainLabel || !MARKET_ASSETS.includes(asset as SupportedMarketAsset)) {
    throw createError({ statusCode: 400, message: 'Invalid product identity.' })
  }

  const chain = MARKET_CHAINS.find(candidate => candidate.label.toLowerCase() === chainLabel.toLowerCase())
  if (!chain || !chain.assets.some(candidate => candidate === asset)) {
    throw createError({ statusCode: 404, message: 'Product chain or asset is not supported.' })
  }

  try {
    const dashboard = await getMultiScopedMarketDashboard(
      [chain.key as SupportedMarketChain],
      [asset as SupportedMarketAsset],
      { limit: 100, query: protocol }
    )
    const candidates = dashboard.data.filter(item =>
      item.protocol.toLowerCase() === protocol.toLowerCase()
      && item.chain.toLowerCase() === chainLabel.toLowerCase()
      && item.asset.toUpperCase() === asset
    )
    const opportunity = candidates.find(item => sourcePoolId && item.sourcePoolId === sourcePoolId)
      ?? candidates.find(item => item.product.toLowerCase() === product.toLowerCase())

    return {
      data: opportunity ?? null,
      meta: dashboard.meta
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error
    console.error('[api/products/detail] product lookup failed', {
      protocol, product, chain: chainLabel, asset,
      detail: error instanceof Error ? error.message : 'Unknown failure'
    })
    throw createError({ statusCode: 502, message: 'Product data is currently unavailable.' })
  }
})
