export type ApiRequestOutcome = 'success' | 'client_error' | 'server_error'

export interface ApiRequestObservation {
  method: string
  route: string
  statusCode: number
  durationMs: number
  outcome: ApiRequestOutcome
  slow: boolean
}

const SLOW_REQUEST_MS = 2_500

export function sanitizeOperationalRoute (value: string): string {
  const pathname = value.split(/[?#]/, 1)[0]?.trim()
  if (!pathname || !pathname.startsWith('/')) return '/unknown'
  return pathname
}

export function buildApiRequestObservation (input: {
  method: string
  route: string
  statusCode: number
  durationMs: number
}): ApiRequestObservation {
  const statusCode = Number.isInteger(input.statusCode) ? input.statusCode : 500
  const durationMs = Math.max(0, Math.round(input.durationMs))
  const outcome: ApiRequestOutcome = statusCode >= 500
    ? 'server_error'
    : statusCode >= 400
      ? 'client_error'
      : 'success'

  return {
    method: input.method.toUpperCase(),
    route: sanitizeOperationalRoute(input.route),
    statusCode,
    durationMs,
    outcome,
    slow: durationMs >= SLOW_REQUEST_MS
  }
}
