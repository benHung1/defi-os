import { ProviderError } from '../../../providers/errors'
import { MarketProvidersUnavailableError } from '../../../services/usdcMarketService'
import { getUsdcMarketDashboard } from '../../../services/usdcMarketDashboardService'

export default defineEventHandler(async () => {
  try {
    return await getUsdcMarketDashboard()
  } catch (error) {
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
