import type { ChainEventRecord } from '../../../shared/types/chainEvents'
import { ProviderError } from '../errors.ts'
import { classifyEventTitle, detectEventAssets, detectEventChains, isRecentTimestamp } from './eventUtils.ts'

const PROVIDER_NAME = 'Dolomite official governance archive'
const ARCHIVE_URL = 'https://docs.dolomite.io/dolomite-governance/past-governance.md'
const DOCS_BASE_URL = 'https://docs.dolomite.io/'

function plainText (value: string): string {
  return value.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*/g, '').trim()
}

function linkFromCell (value: string): string | undefined {
  const match = value.match(/\[[^\]]+\]\(([^)]+)\)/)
  if (!match?.[1]) return undefined
  try {
    return new URL(match[1], DOCS_BASE_URL).toString()
  } catch {
    return undefined
  }
}

function implementationDate (value: string): Date | null {
  const match = plainText(value).match(/implemented\s+(.+)$/i)
  if (!match?.[1]) return null
  const timestamp = Date.parse(match[1])
  return Number.isNaN(timestamp) ? null : new Date(timestamp)
}

export function parseDolomiteGovernanceArchive (
  markdown: string,
  fetchedAt = new Date().toISOString()
): ChainEventRecord[] {
  return markdown.split(/\r?\n/).flatMap((line): ChainEventRecord[] => {
    if (!line.trim().startsWith('|') || /^\|?\s*:?-+/.test(line.trim())) return []
    const cells = line.split('|').slice(1, -1).map(cell => cell.trim())
    if (cells.length < 4 || !/^DIP-\d+/i.test(plainText(cells[0] ?? ''))) return []
    if (!/^passed$/i.test(plainText(cells[1] ?? ''))) return []
    const implementedAt = implementationDate(cells[3] ?? '')
    if (!implementedAt || !isRecentTimestamp(implementedAt.getTime() / 1000)) return []

    const proposalText = plainText(cells[0] ?? '')
    const proposal = proposalText.match(/^DIP-\d+/i)?.[0]?.toUpperCase() ?? proposalText
    const title = proposalText.replace(/^DIP-\d+:?\s*/i, '').trim() || proposal
    const text = `${title} ${cells.join(' ')}`
    return [{
      id: `dolomite-governance:${proposal.toLowerCase()}`,
      ...classifyEventTitle(title),
      protocol: 'Dolomite',
      chains: detectEventChains(text),
      assets: detectEventAssets(text),
      title: `${proposal}: ${title}`,
      summary: 'Dolomite 官方治理紀錄顯示此提案已通過並完成實作；完整影響範圍請查看原始提案。',
      occurredAt: implementedAt.toISOString(),
      source: PROVIDER_NAME,
      sourceKind: 'OFFICIAL_GOVERNANCE',
      verification: 'OFFICIAL',
      sourceUrl: linkFromCell(cells[0] ?? '') ?? linkFromCell(cells[2] ?? '') ?? 'https://docs.dolomite.io/dolomite-governance/past-governance',
      fetchedAt
    }]
  })
}

export async function fetchDolomiteGovernanceEvents (): Promise<{ events: ChainEventRecord[], fetchedAt: string }> {
  const fetchedAt = new Date().toISOString()
  let response: Response
  try {
    response = await fetch(ARCHIVE_URL, {
      headers: { Accept: 'text/markdown' },
      signal: AbortSignal.timeout(15_000)
    })
  } catch (error) {
    throw new ProviderError(PROVIDER_NAME, 'Failed to reach the Dolomite governance archive', { cause: error })
  }
  if (!response.ok) throw new ProviderError(PROVIDER_NAME, `Dolomite governance archive returned HTTP ${response.status}`)
  return { events: parseDolomiteGovernanceArchive(await response.text(), fetchedAt), fetchedAt }
}
