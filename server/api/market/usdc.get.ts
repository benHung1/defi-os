import { ProviderError } from '../../providers/errors'
import {
  getUsdcMarketOpportunities,
  MarketProvidersUnavailableError
} from '../../services/usdcMarketService'

export default defineEventHandler(async () => {
  try {
    return await getUsdcMarketOpportunities()
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown provider failure'
    console.error('[api/market/usdc] upstream failure', {
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
