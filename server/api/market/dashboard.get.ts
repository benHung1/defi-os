import type { SupportedMarketAsset } from '../../providers/aave/scopedMarkets'
import { isSupportedMarketChain, MARKET_ASSETS, MARKET_CHAINS, type SupportedMarketChain } from '../../marketRegistry'
import { getMultiScopedMarketDashboard } from '../../services/scopedMarketDashboardService'

const CHAINS = MARKET_CHAINS.map(chain => chain.key)
const ASSETS = MARKET_ASSETS

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const chainQuery = String(query.chains ?? query.chain ?? 'ethereum').toLowerCase()
  const assetQuery = String(query.assets ?? query.asset ?? 'usdc').toUpperCase()
  const chains = chainQuery === 'all' ? [...CHAINS] : chainQuery.split(',').filter(Boolean)
  const assets = assetQuery === 'ALL' ? [...ASSETS] : assetQuery.split(',').filter(Boolean)
  const limit = query.limit === undefined ? 5 : Number(query.limit)
  const keyword = String(query.q ?? '').trim()

  if (chains.length === 0 || assets.length === 0 || chains.some(chain => !isSupportedMarketChain(chain)) || assets.some(asset => !ASSETS.includes(asset as SupportedMarketAsset))) {
    throw createError({ statusCode: 400, message: 'Unsupported chain or asset.' })
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw createError({ statusCode: 400, message: 'limit must be an integer from 1 to 100.' })
  }
  if (keyword.length > 80) {
    throw createError({ statusCode: 400, message: 'q must be at most 80 characters.' })
  }
  try {
    return await getMultiScopedMarketDashboard([...new Set(chains)] as SupportedMarketChain[], [...new Set(assets)] as SupportedMarketAsset[], {
      forceRefresh: query.refresh === '1',
      limit,
      query: keyword
    })
  } catch (error) {
    console.error('[api/market/dashboard] upstream failure', {
      chains, assets, detail: error instanceof Error ? error.message : 'Unknown failure'
    })
    throw createError({ statusCode: 502, message: 'Market data is currently unavailable.' })
  }
})
