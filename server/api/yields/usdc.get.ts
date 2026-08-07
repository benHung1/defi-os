import { ProviderError } from '../../providers/errors'
import { getUsdcYieldOpportunities } from '../../services/usdcYieldService'

export default defineEventHandler(async () => {
  try {
    return await getUsdcYieldOpportunities()
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown provider failure'
    console.error('[api/yields/usdc] upstream failure', {
      detail,
      provider: error instanceof ProviderError ? error.provider : 'unknown'
    })

    throw createError({
      statusCode: 502,
      statusMessage: 'Bad Gateway',
      message: 'USDC yield data is currently unavailable.'
    })
  }
})
