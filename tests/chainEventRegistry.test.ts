import assert from 'node:assert/strict'
import test from 'node:test'
import { EVENT_PROTOCOLS, eventCoverageForProtocols, providersForProtocols } from '../server/eventRegistry.ts'
import { parseDolomiteGovernanceArchive } from '../server/providers/events/dolomiteGovernance.ts'

test('registry reports supported and unavailable protocol coverage explicitly', () => {
  const coverage = eventCoverageForProtocols(['Aave', 'Maple', 'Dolomite', 'Pareto'])
  assert.deepEqual(coverage.map(item => [item.protocol, item.status]), [
    ['Aave', 'supported'],
    ['Maple', 'supported'],
    ['Dolomite', 'supported'],
    ['Pareto', 'unavailable']
  ])
  assert.deepEqual(providersForProtocols(['Maple', 'Pareto']).map(provider => provider.key), ['snapshot'])
  assert.equal(EVENT_PROTOCOLS.includes('Sentora'), true)
})

test('Dolomite archive parser only emits recently implemented proposals', () => {
  const markdown = `
| Proposal | Outcome | Final vote | Implementation status/date | Current documentation |
| --- | --- | --- | --- | --- |
| [DIP-07: Upgrade USDC market](/dolomite-governance/past-governance/dip-07.md) | Passed | [Vote](https://example.com/vote) | Implemented August 11, 2026 | Docs |
| DIP-08: Pending market change | Passed | Vote | In development | Docs |
| DIP-09: Rejected change | Did not pass | Vote | Implemented August 20, 2026 | Docs |
`
  const events = parseDolomiteGovernanceArchive(markdown, '2026-09-01T00:00:00.000Z')
  assert.equal(events.length, 1)
  assert.equal(events[0]?.protocol, 'Dolomite')
  assert.equal(events[0]?.title, 'DIP-07: Upgrade USDC market')
  assert.deepEqual(events[0]?.assets, ['USDC'])
  assert.equal(events[0]?.sourceUrl, 'https://docs.dolomite.io/dolomite-governance/past-governance/dip-07.md')
})
