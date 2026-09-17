import { ProviderError } from '../../../providers/errors'
import { MarketProvidersUnavailableError } from '../../../services/usdcMarketService'
import { getUsdcMarketDashboard } from '../../../services/usdcMarketDashboardService'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const limit = query.limit === undefined ? 5 : Number(query.limit)
    const sort = query.sort ?? 'tvl'
    const chain = query.chain ?? 'ethereum'
    const asset = query.asset ?? 'usdc'

    if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
      throw createError({ statusCode: 400, message: 'limit must be an integer from 1 to 20.' })
    }
    if (sort !== 'tvl' || String(chain).toLowerCase() !== 'ethereum' || String(asset).toLowerCase() !== 'usdc') {
      throw createError({
        statusCode: 400,
        message: 'Supported ranking query: sort=tvl&chain=ethereum&asset=usdc.'
      })
    }

    return await getUsdcMarketDashboard({
      forceRefresh: query.refresh === '1',
      limit
    })
  } catch (error) {
    if (isError(error) && error.statusCode === 400) {
      throw error
    }
    const detail = error instanceof Error ? error.message : 'Unknown provider failure'
    console.error('[api/market/usdc/dashboard] upstream failure', {
      detail,
      provider: error instanceof ProviderError ? error.provider : 'unknown',
      totalFailure: error instanceof MarketProvidersUnavailableError
    })

    throw createError({
      statusCode: 502,
      statusMessage: 'Bad Gateway',
      message: 'USDC market data is currently unavailable.'
    })
  }
})
