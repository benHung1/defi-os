import type {
  ChainEventProviderMeta,
  ChainEventRecord,
  ChainEventResponse
} from '../../shared/types/chainEvents'
import { fetchAaveGovernanceEvents } from '../providers/events/aaveGovernance'
import { fetchSnapshotGovernanceEvents } from '../providers/events/snapshotGovernance'
import { fetchSparkGovernanceEvents } from '../providers/events/sparkGovernance'

export const SUPPORTED_EVENT_PROTOCOLS = ['Aave', 'Morpho Blue', 'Spark', 'Compound', 'Fluid'] as const
export type SupportedEventProtocol = typeof SUPPORTED_EVENT_PROTOCOLS[number]

interface EventFetchResult {
  events: ChainEventRecord[]
  fetchedAt: string
}

interface ProviderCacheEntry extends EventFetchResult {
  expiresAt: number
}

const CACHE_TTL_MS = 10 * 60 * 1000
const CLIENT_REFRESH_SECONDS = 5 * 60
const providerCache = new Map<string, ProviderCacheEntry>()
const providerRequests = new Map<string, Promise<EventFetchResult>>()

async function fetchCachedProvider (
  key: string,
  fetcher: () => Promise<EventFetchResult>
): Promise<EventFetchResult & { servedFromCache: boolean }> {
  const cached = providerCache.get(key)
  if (cached && cached.expiresAt > Date.now()) return { ...cached, servedFromCache: true }

  let pending = providerRequests.get(key)
  if (!pending) {
    pending = fetcher()
    providerRequests.set(key, pending)
  }

  try {
    const result = await pending
    providerCache.set(key, { ...result, expiresAt: Date.now() + CACHE_TTL_MS })
    return { ...result, servedFromCache: false }
  } catch (error) {
    if (cached) return { ...cached, servedFromCache: true }
    throw error
  } finally {
    if (providerRequests.get(key) === pending) providerRequests.delete(key)
  }
}

function intersects (left: string[], right: string[]): boolean {
  const normalized = new Set(left.map(value => value.toLocaleLowerCase()))
  return right.some(value => normalized.has(value.toLocaleLowerCase()))
}

function isRelevantEvent (
  event: ChainEventRecord,
  protocols: SupportedEventProtocol[],
  chains: string[],
  assets: string[]
): boolean {
  if (!protocols.includes(event.protocol as SupportedEventProtocol)) return false
  if (event.chains.length > 0 && chains.length > 0 && !intersects(event.chains, chains)) return false
  if (event.assets.length > 0 && assets.length > 0 && !intersects(event.assets, assets)) return false
  return true
}

const severityRank = { CRITICAL: 3, WATCH: 2, INFO: 1 } as const

export async function getRelevantChainEvents (
  protocols: SupportedEventProtocol[],
  chains: string[],
  assets: string[],
  limit = 5
): Promise<ChainEventResponse> {
  if (protocols.length === 0) {
    return {
      data: [],
      meta: {
        fetchedAt: new Date().toISOString(),
        providers: [],
        servedFromCache: true,
        requestedProtocols: [],
        refreshIntervalSeconds: CLIENT_REFRESH_SECONDS
      }
    }
  }

  const providers: Array<{ key: string, name: string, fetcher: () => Promise<EventFetchResult> }> = []
  if (protocols.includes('Aave')) {
    providers.push({ key: 'aave', name: 'Aave DAO governance', fetcher: fetchAaveGovernanceEvents })
  }
  if (protocols.includes('Spark')) {
    providers.push({ key: 'spark', name: 'Spark governance spells', fetcher: fetchSparkGovernanceEvents })
  }
  if (protocols.some(protocol => protocol === 'Morpho Blue' || protocol === 'Compound' || protocol === 'Fluid')) {
    providers.push({ key: 'snapshot', name: 'Snapshot governance', fetcher: fetchSnapshotGovernanceEvents })
  }

  const results = await Promise.allSettled(providers.map(provider =>
    fetchCachedProvider(provider.key, provider.fetcher)
  ))
  const providerMeta: ChainEventProviderMeta[] = results.map((result, index) => ({
    name: providers[index]!.name,
    status: result.status === 'fulfilled' ? 'ok' : 'error',
    fetchedAt: result.status === 'fulfilled' ? result.value.fetchedAt : undefined
  }))
  const successful = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : [])
  const events = successful
    .flatMap(result => result.events)
    .filter(event => isRelevantEvent(event, protocols, chains, assets))
    .filter((event, index, all) => all.findIndex(candidate => candidate.id === event.id) === index)
    .sort((left, right) => {
      const severity = severityRank[right.severity] - severityRank[left.severity]
      return severity || Date.parse(right.occurredAt) - Date.parse(left.occurredAt)
    })
    .slice(0, limit)
  const fetchedAt = successful.map(result => result.fetchedAt).sort().at(-1) ?? new Date().toISOString()

  return {
    data: events,
    meta: {
      fetchedAt,
      providers: providerMeta,
      servedFromCache: successful.length > 0 && successful.every(result => result.servedFromCache),
      requestedProtocols: protocols,
      refreshIntervalSeconds: CLIENT_REFRESH_SECONDS
    }
  }
}
