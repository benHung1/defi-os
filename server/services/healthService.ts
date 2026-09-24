export type HealthCheckStatus = 'pass' | 'fail' | 'skipped'

export interface HealthSnapshot {
  status: 'ok' | 'degraded'
  service: 'defi-os'
  environment: string
  timestamp: string
  checks: {
    runtime: { status: 'pass' }
    reownProjectId: {
      status: HealthCheckStatus
      required: boolean
    }
  }
}

const REOWN_PROJECT_ID = /^[a-f0-9]{32}$/i

export function buildHealthSnapshot (
  input: {
    environment?: string
    reownProjectId?: string
    now?: Date
  } = {}
): HealthSnapshot {
  const environment = input.environment?.trim() || 'development'
  const production = environment === 'production'
  const reownConfigured = REOWN_PROJECT_ID.test(input.reownProjectId?.trim() ?? '')
  const reownStatus: HealthCheckStatus = reownConfigured ? 'pass' : production ? 'fail' : 'skipped'

  return {
    status: reownStatus === 'fail' ? 'degraded' : 'ok',
    service: 'defi-os',
    environment,
    timestamp: (input.now ?? new Date()).toISOString(),
    checks: {
      runtime: { status: 'pass' },
      reownProjectId: {
        status: reownStatus,
        required: production
      }
    }
  }
}
