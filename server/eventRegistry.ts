import type { ChainEventRecord, ChainEventProtocolCoverage } from '../shared/types/chainEvents'
import { fetchAaveGovernanceEvents } from './providers/events/aaveGovernance.ts'
import { fetchDolomiteGovernanceEvents } from './providers/events/dolomiteGovernance.ts'
import { fetchSnapshotGovernanceEvents } from './providers/events/snapshotGovernance.ts'
import { fetchSparkGovernanceEvents } from './providers/events/sparkGovernance.ts'
import { fetchYearnSecurityEvents } from './providers/events/yearnSecurity.ts'

export interface EventFetchResult {
  events: ChainEventRecord[]
  fetchedAt: string
}

export interface EventProviderDefinition {
  key: string
  name: string
  protocols: readonly EventProtocol[]
  fetcher: () => Promise<EventFetchResult>
}

export const EVENT_PROTOCOLS = [
  'Aave', 'Morpho Blue', 'Spark', 'Compound', 'Fluid',
  'Maple', 'Yearn', 'Pareto', 'Midas', 'Dolomite', 'Sentora'
] as const
export type EventProtocol = typeof EVENT_PROTOCOLS[number]

export const EVENT_PROVIDERS: readonly EventProviderDefinition[] = [
  { key: 'aave', name: 'Aave DAO governance', protocols: ['Aave'], fetcher: fetchAaveGovernanceEvents },
  { key: 'spark', name: 'Spark governance spells', protocols: ['Spark'], fetcher: fetchSparkGovernanceEvents },
  {
    key: 'snapshot',
    name: 'Snapshot governance',
    protocols: ['Morpho Blue', 'Compound', 'Fluid', 'Maple'],
    fetcher: fetchSnapshotGovernanceEvents
  },
  { key: 'dolomite', name: 'Dolomite official governance archive', protocols: ['Dolomite'], fetcher: fetchDolomiteGovernanceEvents },
  { key: 'yearn-security', name: 'Yearn official security disclosures', protocols: ['Yearn'], fetcher: fetchYearnSecurityEvents }
]

export function providersForProtocols (protocols: EventProtocol[]): EventProviderDefinition[] {
  return EVENT_PROVIDERS.filter(provider => provider.protocols.some(protocol => protocols.includes(protocol)))
}

export function eventCoverageForProtocols (protocols: EventProtocol[]): ChainEventProtocolCoverage[] {
  return protocols.map(protocol => {
    const providers = EVENT_PROVIDERS.filter(provider => provider.protocols.includes(protocol)).map(provider => provider.name)
    return { protocol, status: providers.length > 0 ? 'supported' : 'unavailable', providers }
  })
}
