import { ProviderError } from '../../../providers/errors'
import { MarketProvidersUnavailableError } from '../../../services/usdcMarketService'
import { getUsdcMarketDashboard } from '../../../services/usdcMarketDashboardService'
import type { DataSourceKind, MarketDashboardSort, OpportunityType, RateType } from '../../../types/yield'

const OPPORTUNITY_TYPES: Record<string, OpportunityType> = {
  lending: 'LENDING_SUPPLY', savings: 'SAVINGS', vault: 'CURATED_VAULT'
}
const SOURCE_KINDS: Record<string, DataSourceKind> = {
  official: 'OFFICIAL_API', onchain: 'ONCHAIN', third_party: 'THIRD_PARTY_AGGREGATOR'
}

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
    if (!['tvl', 'rate'].includes(String(sort)) || String(chain).toLowerCase() !== 'ethereum' || String(asset).toLowerCase() !== 'usdc') {
      throw createError({
        statusCode: 400,
        message: 'Supported scope: chain=ethereum&asset=usdc; sort must be tvl or rate.'
      })
    }

    const typeKey = query.type === undefined ? 'all' : String(query.type).toLowerCase()
    const sourceKey = query.source === undefined ? 'all' : String(query.source).toLowerCase()
    const rateTypeKey = query.rateType === undefined ? 'all' : String(query.rateType).toLowerCase()
    if (!(typeKey === 'all' || typeKey in OPPORTUNITY_TYPES)
      || !(sourceKey === 'all' || sourceKey in SOURCE_KINDS)
      || !['all', 'apr', 'apy'].includes(rateTypeKey)
      || (sort === 'rate' && rateTypeKey === 'all')) {
      throw createError({
        statusCode: 400,
        message: 'Invalid filters. sort=rate requires rateType=apr or rateType=apy.'
      })
    }

    return await getUsdcMarketDashboard({
      forceRefresh: query.refresh === '1',
      limit,
      sort: sort as MarketDashboardSort,
      opportunityType: typeKey === 'all' ? undefined : OPPORTUNITY_TYPES[typeKey],
      sourceKind: sourceKey === 'all' ? undefined : SOURCE_KINDS[sourceKey],
      rateType: rateTypeKey === 'all' ? undefined : rateTypeKey.toUpperCase() as RateType
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
