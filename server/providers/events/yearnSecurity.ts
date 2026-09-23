import type { ChainEventRecord } from '../../../shared/types/chainEvents'
import { ProviderError } from '../errors.ts'
import { detectEventAssets, detectEventChains, isRecentTimestamp } from './eventUtils.ts'

const PROVIDER_NAME = 'Yearn official security disclosures'
const CONTENTS_URL = 'https://api.github.com/repos/yearn/yearn-security/contents/disclosures'

function isRecord (value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function fetchText (url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { Accept: 'text/plain', 'User-Agent': 'DeFi-OS' },
    signal: AbortSignal.timeout(15_000)
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.text()
}

export async function fetchYearnSecurityEvents (): Promise<{ events: ChainEventRecord[], fetchedAt: string }> {
  const fetchedAt = new Date().toISOString()
  let response: Response
  try {
    response = await fetch(CONTENTS_URL, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'DeFi-OS' },
      signal: AbortSignal.timeout(15_000)
    })
  } catch (error) {
    throw new ProviderError(PROVIDER_NAME, 'Failed to reach the Yearn security repository', { cause: error })
  }
  if (!response.ok) throw new ProviderError(PROVIDER_NAME, `Yearn security repository returned HTTP ${response.status}`)
  const payload: unknown = await response.json()
  if (!Array.isArray(payload)) throw new ProviderError(PROVIDER_NAME, 'Yearn security repository returned an invalid payload')

  const recent = payload.flatMap((entry): Array<{ name: string, downloadUrl: string, htmlUrl: string, date: Date }> => {
    if (!isRecord(entry) || typeof entry.name !== 'string' || typeof entry.download_url !== 'string' || typeof entry.html_url !== 'string') return []
    const match = entry.name.match(/^(\d{4}-\d{2}-\d{2})\.md$/)
    if (!match?.[1]) return []
    const date = new Date(`${match[1]}T12:00:00.000Z`)
    return isRecentTimestamp(date.getTime() / 1000) ? [{ name: entry.name, downloadUrl: entry.download_url, htmlUrl: entry.html_url, date }] : []
  })

  try {
    const documents = await Promise.all(recent.map(async entry => ({ ...entry, body: await fetchText(entry.downloadUrl) })))
    return {
      events: documents.map(document => {
        const title = document.body.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? `Yearn security disclosure ${document.name.slice(0, 10)}`
        const scope = `${title}\n${document.body}`
        return {
          id: `yearn-security:${document.name}`,
          type: 'SECURITY',
          severity: 'CRITICAL',
          protocol: 'Yearn',
          chains: detectEventChains(scope),
          assets: detectEventAssets(scope),
          title,
          summary: 'Yearn 官方安全 repository 已發布事件揭露；請查看原始文件確認受影響產品與處理狀態。',
          occurredAt: document.date.toISOString(),
          source: PROVIDER_NAME,
          sourceKind: 'OFFICIAL_REPOSITORY',
          verification: 'OFFICIAL',
          sourceUrl: document.htmlUrl,
          fetchedAt
        } satisfies ChainEventRecord
      }),
      fetchedAt
    }
  } catch (error) {
    throw new ProviderError(PROVIDER_NAME, 'Failed to read a Yearn security disclosure', { cause: error })
  }
}
