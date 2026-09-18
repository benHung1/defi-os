import type { ChainEventRecord } from '../../../shared/types/chainEvents'
import { ProviderError } from '../errors'
import { detectEventAssets, isRecentTimestamp } from './eventUtils'

const PROVIDER_NAME = 'Spark governance spells'
const COMMITS_URL = 'https://api.github.com/repos/sparkdotfi/spark-spells/commits?path=archive&per_page=5'

function isRecord (value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function fetchSparkGovernanceEvents (): Promise<{ events: ChainEventRecord[], fetchedAt: string }> {
  const fetchedAt = new Date().toISOString()
  let response: Response
  try {
    response = await fetch(COMMITS_URL, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'DeFi-OS' },
      signal: AbortSignal.timeout(15_000)
    })
  } catch (error) {
    throw new ProviderError(PROVIDER_NAME, 'Failed to reach the Spark governance repository', { cause: error })
  }
  if (!response.ok) throw new ProviderError(PROVIDER_NAME, `Spark governance repository returned HTTP ${response.status}`)

  const payload: unknown = await response.json()
  if (!Array.isArray(payload)) throw new ProviderError(PROVIDER_NAME, 'Spark governance repository returned an invalid payload')

  const events = payload.flatMap((value): ChainEventRecord[] => {
    if (!isRecord(value)
      || typeof value.sha !== 'string'
      || typeof value.html_url !== 'string'
      || !isRecord(value.commit)
      || typeof value.commit.message !== 'string'
      || !isRecord(value.commit.committer)
      || typeof value.commit.committer.date !== 'string') return []

    const timestamp = Date.parse(value.commit.committer.date)
    if (Number.isNaN(timestamp) || !isRecentTimestamp(timestamp / 1000)) return []
    const title = value.commit.message.split('\n')[0]?.trim() ?? 'Spark governance spell'
    return [{
      id: `spark-spell:${value.sha}`,
      type: 'UPGRADE',
      severity: 'WATCH',
      protocol: 'Spark',
      chains: ['Ethereum'],
      assets: detectEventAssets(title),
      title: title.replace(/^feat:\s*/i, ''),
      summary: 'Spark 官方治理 spell repository 已發布新的正式變更；請查看原始提交確認完整參數。',
      occurredAt: new Date(timestamp).toISOString(),
      source: 'Spark official governance repository',
      sourceKind: 'OFFICIAL_REPOSITORY',
      verification: 'OFFICIAL',
      sourceUrl: value.html_url,
      fetchedAt
    }]
  })

  return { events, fetchedAt }
}
