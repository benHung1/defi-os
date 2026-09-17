import type { SupportedMarketAsset } from '../../providers/aave/scopedMarkets'
import { getMultiScopedMarketDashboard, type SupportedMarketChain } from '../../services/scopedMarketDashboardService'

const CHAINS = ['ethereum', 'base', 'arbitrum'] as const
const ASSETS = ['USDC', 'USDT', 'ETH', 'BTC'] as const

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const chains = String(query.chains ?? query.chain ?? 'ethereum').toLowerCase().split(',').filter(Boolean)
  const assets = String(query.assets ?? query.asset ?? 'usdc').toUpperCase().split(',').filter(Boolean)
  const limit = query.limit === undefined ? 5 : Number(query.limit)

  if (chains.length === 0 || assets.length === 0 || chains.some(chain => !CHAINS.includes(chain as SupportedMarketChain)) || assets.some(asset => !ASSETS.includes(asset as SupportedMarketAsset))) {
    throw createError({ statusCode: 400, message: 'Unsupported chain or asset.' })
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
    throw createError({ statusCode: 400, message: 'limit must be an integer from 1 to 20.' })
  }
  try {
    return await getMultiScopedMarketDashboard([...new Set(chains)] as SupportedMarketChain[], [...new Set(assets)] as SupportedMarketAsset[], {
      forceRefresh: query.refresh === '1',
      limit
    })
  } catch (error) {
    console.error('[api/market/dashboard] upstream failure', {
      chains, assets, detail: error instanceof Error ? error.message : 'Unknown failure'
    })
    throw createError({ statusCode: 502, message: 'Market data is currently unavailable.' })
  }
})
