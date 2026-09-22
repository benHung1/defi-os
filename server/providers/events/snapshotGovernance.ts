import type { ChainEventRecord } from '../../../shared/types/chainEvents'
import { ProviderError } from '../errors.ts'
import { classifyEventTitle, detectEventAssets, detectEventChains, isMaterialGovernanceTitle, isRecentTimestamp } from './eventUtils.ts'

const PROVIDER_NAME = 'Snapshot governance'
const SNAPSHOT_URL = 'https://hub.snapshot.org/graphql'
const SPACE_PROTOCOLS: Record<string, string> = {
  'morpho.eth': 'Morpho Blue',
  'comp-vote.eth': 'Compound',
  'instadapp-gov.eth': 'Fluid',
  'maple.eth': 'Maple'
}

const QUERY = `
query RecentProtocolGovernance {
  proposals(
    first: 60
    skip: 0
    where: { space_in: ["morpho.eth", "comp-vote.eth", "instadapp-gov.eth", "maple.eth"], state: "closed" }
    orderBy: "end"
    orderDirection: desc
  ) {
    id title end state scores choices space { id name }
  }
}`

function isRecord (value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function passedProposal (proposal: Record<string, unknown>): boolean {
  if (!Array.isArray(proposal.choices) || !Array.isArray(proposal.scores)) return false
  const choices = proposal.choices
  const scores = proposal.scores
  const supportIndex = choices.findIndex(choice => typeof choice === 'string' && /^(?:for|yes|support|approve)/i.test(choice.trim()))
  if (supportIndex < 0 || typeof scores[supportIndex] !== 'number') return false
  const opposition = choices.reduce((total, choice, index) => {
    if (typeof choice !== 'string' || !/^(?:against|no|reject)/i.test(choice.trim())) return total
    const score = scores[index]
    return total + (typeof score === 'number' ? score : 0)
  }, 0)
  return scores[supportIndex] > opposition
}

export async function fetchSnapshotGovernanceEvents (): Promise<{ events: ChainEventRecord[], fetchedAt: string }> {
  const fetchedAt = new Date().toISOString()
  let response: Response
  try {
    response = await fetch(SNAPSHOT_URL, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: QUERY }),
      signal: AbortSignal.timeout(15_000)
    })
  } catch (error) {
    throw new ProviderError(PROVIDER_NAME, 'Failed to reach Snapshot GraphQL', { cause: error })
  }
  if (!response.ok) throw new ProviderError(PROVIDER_NAME, `Snapshot GraphQL returned HTTP ${response.status}`)

  const payload: unknown = await response.json()
  if (!isRecord(payload) || !isRecord(payload.data) || !Array.isArray(payload.data.proposals)) {
    throw new ProviderError(PROVIDER_NAME, 'Snapshot GraphQL returned an invalid payload')
  }

  const events = payload.data.proposals.flatMap((value): ChainEventRecord[] => {
    if (!isRecord(value)
      || typeof value.id !== 'string'
      || typeof value.title !== 'string'
      || typeof value.end !== 'number'
      || value.state !== 'closed'
      || !isRecentTimestamp(value.end)
      || !passedProposal(value)
      || !isRecord(value.space)
      || typeof value.space.id !== 'string') return []

    const protocol = SPACE_PROTOCOLS[value.space.id]
    if (!protocol) return []
    if (protocol === 'Fluid' && !/fluid|instadapp/i.test(value.title)) return []
    if (!isMaterialGovernanceTitle(value.title)) return []

    const classification = classifyEventTitle(value.title)
    return [{
      id: `snapshot:${value.id}`,
      ...classification,
      protocol,
      chains: detectEventChains(value.title),
      assets: detectEventAssets(value.title),
      title: value.title.trim(),
      summary: '官方治理空間的投票已結束，支持選項取得多數；治理結果不等同鏈上執行。',
      occurredAt: new Date(value.end * 1000).toISOString(),
      source: 'Snapshot verified governance space',
      sourceKind: 'OFFICIAL_GOVERNANCE',
      verification: 'OFFICIAL',
      sourceUrl: `https://snapshot.org/#/${value.space.id}/proposal/${value.id}`,
      fetchedAt
    }]
  })

  return { events, fetchedAt }
}
