import { getPortfolio } from '../services/portfolioService'

const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/

export default defineEventHandler(async (event) => {
  const address = getQuery(event).address
  if (typeof address !== 'string' || !EVM_ADDRESS.test(address)) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'A valid EVM address is required.' })
  }

  try {
    return await getPortfolio(address.toLowerCase())
  } catch (error) {
    console.error('[api/portfolio] portfolio lookup failed', {
      detail: error instanceof Error ? error.message : 'Unknown portfolio failure'
    })
    throw createError({ statusCode: 502, statusMessage: 'Bad Gateway', message: 'Portfolio data is currently unavailable.' })
  }
})
