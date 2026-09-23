import {
  getRelevantChainEvents,
  SUPPORTED_EVENT_PROTOCOLS,
  type SupportedEventProtocol
} from '../services/chainEventService'

const MAX_SCOPE_VALUES = 20

function commaValues (value: unknown): string[] {
  const raw = Array.isArray(value) ? value.join(',') : String(value ?? '')
  return [...new Set(raw.split(',').map(item => item.trim()).filter(Boolean))].slice(0, MAX_SCOPE_VALUES)
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const requestedProtocols = commaValues(query.protocols)
  const protocols = requestedProtocols.filter((protocol): protocol is SupportedEventProtocol =>
    SUPPORTED_EVENT_PROTOCOLS.includes(protocol as SupportedEventProtocol)
  )
  const chains = commaValues(query.chains)
  const assets = commaValues(query.assets).map(asset => asset.toUpperCase())
  const requestedLimit = Number(query.limit ?? 5)
  const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 5) : 5

  if (protocols.length !== requestedProtocols.length) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Unsupported event protocol.' })
  }

  try {
    return await getRelevantChainEvents(protocols, chains, assets, limit)
  } catch (error) {
    console.error('[api/events] event lookup failed', {
      protocols,
      detail: error instanceof Error ? error.message : 'Unknown event provider failure'
    })
    throw createError({ statusCode: 502, statusMessage: 'Bad Gateway', message: 'Chain event data is currently unavailable.' })
  }
})
