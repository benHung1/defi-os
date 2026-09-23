import assert from 'node:assert/strict'
import test from 'node:test'
import { dailyDecisionEventTarget, evaluateDailyDecision, type DailyDecisionInput } from '../app/utils/dailyDecision.ts'

function readyInput (): DailyDecisionInput {
  return {
    connected: true,
    portfolio: {
      status: 'ready',
      addressLabel: '0x1234…5678',
      assetCount: 2,
      positionCount: 1,
      protocolCount: 1,
      partial: false
    },
    events: {
      status: 'ready',
      supportedProtocolCount: 1,
      providerPartial: false,
      providersUnavailable: false,
      items: []
    },
    comparison: {
      status: 'idle',
      candidateCount: 0,
      bestRateDelta: null,
      bestAnnualDeltaUsd: null,
      rateType: null
    }
  }
}

test('requires review for a held protocol security event', () => {
  const input = readyInput()
  input.events.items.push({
    id: 'security-1',
    type: 'SECURITY',
    severity: 'CRITICAL',
    protocol: 'Aave',
    title: 'Security incident under investigation',
    source: 'Aave DAO',
    sourceUrl: 'https://example.com/aave-event',
    occurredAt: '2026-09-22T00:00:00.000Z',
    chains: ['Ethereum'],
    assets: ['USDC']
  })

  const result = evaluateDailyDecision(input)
  assert.equal(result.status, 'REVIEW_NOW')
  assert.equal(result.primaryAction?.target, '#chain-event-security-1')
  assert.equal(result.reasons[0]?.scope, 'Ethereum · USDC')
  assert.equal(result.reasons[0]?.sourceUrl, 'https://example.com/aave-event')
})

test('requires review for a protocol pause', () => {
  const input = readyInput()
  input.events.items.push({
    id: 'pause-1',
    type: 'PAUSE',
    severity: 'WATCH',
    protocol: 'Compound',
    title: 'USDC market paused',
    source: 'Compound Governance'
  })

  assert.equal(evaluateDailyDecision(input).status, 'REVIEW_NOW')
})

test('marks upgrades and governance changes as watch', () => {
  const input = readyInput()
  input.events.items.push({
    id: 'upgrade-1',
    type: 'UPGRADE',
    severity: 'WATCH',
    protocol: 'Spark',
    title: 'Governance spell published',
    source: 'Spark repository'
  })

  const result = evaluateDailyDecision(input)
  assert.equal(result.status, 'WATCH')
  assert.equal(result.headline, '近 45 天有 1 項持倉相關變化值得了解')
})

test('reports portfolio and event loading as separate stages', () => {
  const portfolioLoading = readyInput()
  portfolioLoading.portfolio.status = 'loading'
  portfolioLoading.events.status = 'idle'

  const portfolioResult = evaluateDailyDecision(portfolioLoading)
  assert.equal(portfolioResult.headline, '正在讀取你的鏈上部位…')
  assert.equal(portfolioResult.reasons.length, 1)

  const eventsLoading = readyInput()
  eventsLoading.events.status = 'loading'

  const eventResult = evaluateDailyDecision(eventsLoading)
  assert.equal(eventResult.headline, '部位已完成，正在核對相關事件…')
  assert.match(eventResult.reasons[0]?.text ?? '', /已核對 1 個協議、1 個鏈上部位/)
})

test('does not elevate a higher yield candidate by itself', () => {
  const input = readyInput()
  input.comparison = {
    status: 'ready',
    candidateCount: 3,
    bestRateDelta: 1.25,
    bestAnnualDeltaUsd: 42,
    rateType: 'APY'
  }

  const result = evaluateDailyDecision(input)
  assert.equal(result.status, 'MAINTAIN')
  assert.equal(result.reasons.at(-1)?.code, 'MARKET_COMPARISON')
})

test('does not claim no action when all event providers are unavailable', () => {
  const input = readyInput()
  input.events.providersUnavailable = true

  assert.equal(evaluateDailyDecision(input).status, 'UNKNOWN')
})

test('does not claim no action before the event lookup starts', () => {
  const input = readyInput()
  input.events.status = 'idle'

  assert.equal(evaluateDailyDecision(input).status, 'UNKNOWN')
})

test('does not claim no action from partial portfolio coverage', () => {
  const input = readyInput()
  input.portfolio.partial = true

  const result = evaluateDailyDecision(input)
  assert.equal(result.status, 'UNKNOWN')
  assert.match(result.reasons[0]?.text ?? '', /已成功核對/)
  assert.match(result.reasons[0]?.text ?? '', /仍有部分持倉來源未完成/)
})

test('does not call an address with no positions healthy', () => {
  const input = readyInput()
  input.portfolio.positionCount = 0
  input.portfolio.protocolCount = 0

  assert.equal(evaluateDailyDecision(input).status, 'NO_POSITIONS')
})

test('builds a stable event anchor from provider ids', () => {
  assert.equal(dailyDecisionEventTarget('snapshot:proposal/123'), '#chain-event-snapshot-proposal-123')
})
