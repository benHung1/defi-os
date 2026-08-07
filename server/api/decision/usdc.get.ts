import { ProviderError } from '../../providers/errors'
import { getUsdcDecisionCandidates } from '../../services/usdcDecisionCandidateService'
import type { UsdcCurrentPosition } from '../../types/position'

/**
 * Temporary position until Portfolio persistence exists.
 * API-layer default only — not part of the domain type module.
 */
const temporaryCurrentPosition: UsdcCurrentPosition = {
  asset: 'USDC',
  protocol: 'Spark',
  product: 'Spark Savings USDC',
  opportunityType: 'SAVINGS',
  chain: 'Ethereum',
  amount: 40000
}

export default defineEventHandler(async () => {
  try {
    return await getUsdcDecisionCandidates(temporaryCurrentPosition)
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown provider failure'
    console.error('[api/decision/usdc] upstream failure', {
      detail,
      provider: error instanceof ProviderError ? error.provider : 'unknown'
    })

    throw createError({
      statusCode: 502,
      statusMessage: 'Bad Gateway',
      message: 'USDC decision candidate data is currently unavailable.'
    })
  }
})
