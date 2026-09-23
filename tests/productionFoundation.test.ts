import assert from 'node:assert/strict'
import test from 'node:test'
import { buildHealthSnapshot } from '../server/services/healthService.ts'
import { buildApiRequestObservation, sanitizeOperationalRoute } from '../server/utils/operationalTelemetry.ts'

test('production health is degraded without a Reown project id', () => {
  const snapshot = buildHealthSnapshot({
    environment: 'production',
    reownProjectId: '',
    now: new Date('2026-09-23T00:00:00.000Z')
  })

  assert.equal(snapshot.status, 'degraded')
  assert.deepEqual(snapshot.checks.reownProjectId, { status: 'fail', required: true })
  assert.equal(JSON.stringify(snapshot).includes('9370657e096c7344be874710739460e6'), false)
})

test('production health passes with a configured Reown project id', () => {
  const snapshot = buildHealthSnapshot({
    environment: 'production',
    reownProjectId: '9370657e096c7344be874710739460e6'
  })

  assert.equal(snapshot.status, 'ok')
  assert.deepEqual(snapshot.checks.reownProjectId, { status: 'pass', required: true })
})

test('production health rejects a malformed Reown project id', () => {
  const snapshot = buildHealthSnapshot({
    environment: 'production',
    reownProjectId: 'not-a-project-id'
  })

  assert.equal(snapshot.status, 'degraded')
  assert.deepEqual(snapshot.checks.reownProjectId, { status: 'fail', required: true })
})

test('development health does not require a Reown project id', () => {
  const snapshot = buildHealthSnapshot({ environment: 'development' })

  assert.equal(snapshot.status, 'ok')
  assert.deepEqual(snapshot.checks.reownProjectId, { status: 'skipped', required: false })
})

test('operational routes remove wallet addresses and all query data', () => {
  const address = '0x0000000000000000000000000000000000000001'
  const route = sanitizeOperationalRoute(`/api/portfolio?address=${address}&debug=1`)
  const observation = buildApiRequestObservation({
    method: 'get',
    route: `/api/portfolio?address=${address}`,
    statusCode: 502,
    durationMs: 2500.4
  })

  assert.equal(route, '/api/portfolio')
  assert.deepEqual(observation, {
    method: 'GET',
    route: '/api/portfolio',
    statusCode: 502,
    durationMs: 2500,
    outcome: 'server_error',
    slow: true
  })
  assert.equal(JSON.stringify(observation).includes(address), false)
})
