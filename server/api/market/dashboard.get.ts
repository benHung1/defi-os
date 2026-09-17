import type { SupportedMarketAsset } from '../../providers/aave/scopedMarkets'
import { getScopedMarketDashboard, isSupportedCombination, type SupportedMarketChain } from '../../services/scopedMarketDashboardService'

const CHAINS = ['ethereum', 'base', 'arbitrum'] as const
const ASSETS = ['USDC', 'USDT', 'ETH', 'BTC'] as const

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const chain = String(query.chain ?? 'ethereum').toLowerCase()
  const asset = String(query.asset ?? 'usdc').toUpperCase()
  const limit = query.limit === undefined ? 5 : Number(query.limit)

  if (!CHAINS.includes(chain as SupportedMarketChain) || !ASSETS.includes(asset as SupportedMarketAsset)) {
    throw createError({ statusCode: 400, message: 'Unsupported chain or asset.' })
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
    throw createError({ statusCode: 400, message: 'limit must be an integer from 1 to 20.' })
  }
  if (!isSupportedCombination(chain as SupportedMarketChain, asset as SupportedMarketAsset)) {
    throw createError({ statusCode: 400, message: `${asset} is not supported on ${chain}.` })
  }

  try {
    return await getScopedMarketDashboard(chain as SupportedMarketChain, asset as SupportedMarketAsset, {
      forceRefresh: query.refresh === '1',
      limit
    })
  } catch (error) {
    console.error('[api/market/dashboard] upstream failure', {
      chain, asset, detail: error instanceof Error ? error.message : 'Unknown failure'
    })
    throw createError({ statusCode: 502, message: 'Market data is currently unavailable.' })
  }
})
