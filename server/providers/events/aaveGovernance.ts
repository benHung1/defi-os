import type { ChainEventRecord } from '../../../shared/types/chainEvents'
import { ProviderError } from '../errors'
import {
  classifyEventTitle,
  detectEventAssets,
  detectEventChains,
  isMaterialGovernanceTitle,
  isRecentTimestamp
} from './eventUtils'

const PROVIDER_NAME = 'Aave DAO governance'
const CACHE_URL = 'https://raw.githubusercontent.com/aave-dao/aave-governance-cache/main/cache/ui/mainnet/list_view_proposals.json'

function isRecord (value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function fetchAaveGovernanceEvents (): Promise<{ events: ChainEventRecord[], fetchedAt: string }> {
  const fetchedAt = new Date().toISOString()
  let response: Response
  try {
    response = await fetch(CACHE_URL, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15_000) })
  } catch (error) {
    throw new ProviderError(PROVIDER_NAME, 'Failed to reach the Aave DAO governance cache', { cause: error })
  }
  if (!response.ok) throw new ProviderError(PROVIDER_NAME, `Aave governance cache returned HTTP ${response.status}`)

  const payload: unknown = await response.json()
  if (!isRecord(payload) || !Array.isArray(payload.proposals)) {
    throw new ProviderError(PROVIDER_NAME, 'Aave governance cache returned an invalid payload')
  }

  const events = payload.proposals.flatMap((value): ChainEventRecord[] => {
    if (!isRecord(value)
      || typeof value.id !== 'number'
      || typeof value.title !== 'string'
      || value.combineState !== 4
      || typeof value.finishedTimestamp !== 'number'
      || !isRecentTimestamp(value.finishedTimestamp)) return []

    const classification = classifyEventTitle(value.title)
    if (classification.type === 'GOVERNANCE' && !isMaterialGovernanceTitle(value.title)) return []
    return [{
      id: `aave-governance:${value.id}`,
      ...classification,
      protocol: 'Aave',
      chains: detectEventChains(value.title),
      assets: detectEventAssets(value.title),
      title: value.title.trim(),
      summary: 'Aave 鏈上治理提案已執行；完整影響範圍請查看 Aave DAO 官方治理頁。',
      occurredAt: new Date(value.finishedTimestamp * 1000).toISOString(),
      source: 'Aave DAO governance cache',
      sourceKind: 'ONCHAIN',
      verification: 'ONCHAIN_VERIFIED',
      sourceUrl: `https://vote.onaave.com/proposal/?proposalId=${value.id}`,
      fetchedAt
    }]
  })

  return { events, fetchedAt }
}
