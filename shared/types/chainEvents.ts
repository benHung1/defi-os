export type ChainEventType = 'SECURITY' | 'PAUSE' | 'UPGRADE' | 'GOVERNANCE'
export type ChainEventSeverity = 'INFO' | 'WATCH' | 'CRITICAL'
export type ChainEventVerification = 'OFFICIAL' | 'ONCHAIN_VERIFIED'
export type ChainEventSourceKind = 'OFFICIAL_GOVERNANCE' | 'OFFICIAL_REPOSITORY' | 'ONCHAIN'

export interface ChainEventRecord {
  id: string
  type: ChainEventType
  severity: ChainEventSeverity
  protocol: string
  chains: string[]
  assets: string[]
  title: string
  summary: string
  occurredAt: string
  source: string
  sourceKind: ChainEventSourceKind
  verification: ChainEventVerification
  sourceUrl: string
  fetchedAt: string
}

export interface ChainEventProviderMeta {
  name: string
  status: 'ok' | 'error'
  fetchedAt?: string
}

export interface ChainEventResponse {
  data: ChainEventRecord[]
  meta: {
    fetchedAt: string
    providers: ChainEventProviderMeta[]
    servedFromCache: boolean
    requestedProtocols: string[]
    refreshIntervalSeconds: number
  }
}
