import { ProviderError } from '../../providers/errors'
import { getUsdcDecisionCandidates } from '../../services/usdcDecisionCandidateService'
import type { UsdcCurrentPosition } from '../../types/position'
import type { OpportunityType, RateType } from '../../types/yield'

const OPPORTUNITY_TYPES: OpportunityType[] = ['LENDING_SUPPLY', 'SAVINGS', 'CURATED_VAULT']
const RATE_TYPES: RateType[] = ['APR', 'APY']

function queryString (value: unknown): string {
  return Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '')
}

function parseCurrentPosition (event: Parameters<typeof getQuery>[0]): UsdcCurrentPosition {
  const query = getQuery(event)
  const protocol = queryString(query.protocol).trim()
  const product = queryString(query.product).trim()
  const chain = queryString(query.chain).trim()
  const opportunityType = queryString(query.opportunityType).toUpperCase() as OpportunityType
  const amount = Number(queryString(query.amount))
  const rateValue = queryString(query.rate)
  const rate = rateValue === '' ? undefined : Number(rateValue)
  const rateTypeValue = queryString(query.rateType).toUpperCase()
  const rateType = rateTypeValue === '' ? undefined : rateTypeValue as RateType

  if (
    !protocol
    || !product
    || !chain
    || !OPPORTUNITY_TYPES.includes(opportunityType)
    || !Number.isFinite(amount)
    || amount <= 0
    || (rate !== undefined && (!Number.isFinite(rate) || rate < 0))
    || (rateType !== undefined && !RATE_TYPES.includes(rateType))
    || ((rate === undefined) !== (rateType === undefined))
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'A valid USDC position is required.'
    })
  }

  return {
    asset: 'USDC',
    protocol,
    product,
    opportunityType,
    chain,
    amount,
    rate,
    rateType
  }
}

export default defineEventHandler(async (event) => {
  try {
    return await getUsdcDecisionCandidates(parseCurrentPosition(event))
  } catch (error) {
    if (isError(error) && error.statusCode === 400) throw error

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
