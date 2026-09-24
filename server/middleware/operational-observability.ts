import { buildApiRequestObservation, sanitizeOperationalRoute } from '../utils/operationalTelemetry'

export default defineEventHandler((event) => {
  const route = sanitizeOperationalRoute(event.path)
  if (!route.startsWith('/api/')) return

  const startedAt = performance.now()
  event.node.res.once('finish', () => {
    console.info('[ops] api_request', buildApiRequestObservation({
      method: event.method,
      route,
      statusCode: event.node.res.statusCode,
      durationMs: performance.now() - startedAt
    }))
  })
})
