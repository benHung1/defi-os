import type { OpportunityType, YieldOpportunity } from './types/yield'

export type PositionAdapterKey =
  | 'aave-v3'
  | 'spark-lend'
  | 'spark-savings'
  | 'compound-v3'
  | 'morpho-blue'
  | 'fluid'
  | 'maple'
  | 'yearn'
  | 'pareto'
  | 'midas'
  | 'dolomite'
  | 'sentora'

/**
 * Position adapters are enabled from the same registry that admits products to
 * market discovery. This prevents the Market and Portfolio sections drifting
 * into two unrelated product lists.
 */
export const POSITION_ADAPTER_KEYS: PositionAdapterKey[] = [
  'aave-v3',
  'spark-lend',
  'spark-savings',
  'compound-v3',
  'morpho-blue',
  'fluid',
  'maple',
  'yearn',
  'pareto',
  'midas',
  'dolomite',
  'sentora'
]

interface DiscoveryProduct {
  protocol: string
  type: OpportunityType
  /** Empty means the adapter dynamically covers every matching product. */
  poolIds?: readonly string[]
}

export const DEFILLAMA_DISCOVERY_PRODUCTS: Record<string, DiscoveryProduct> = {
  maple: {
    protocol: 'Maple',
    type: 'LENDING_SUPPLY',
    poolIds: ['43641cf5-a92e-416b-bce9-27113d3c0db6']
  },
  'pareto-credit': {
    protocol: 'Pareto',
    type: 'CURATED_VAULT',
    poolIds: [
      '2eb2bdf8-c3e3-5b30-8d49-8d5232294184',
      '015556b9-0b7d-5dc5-9a9d-99ee3fbe89ee',
      '131faace-08f6-5516-8345-37dee670dccc'
    ]
  },
  'sentora-curator': {
    protocol: 'Sentora',
    type: 'CURATED_VAULT',
    poolIds: ['f4200c7d-d3fd-5b88-9398-ba66eac63a03']
  },
  'midas-rwa': {
    protocol: 'Midas',
    type: 'CURATED_VAULT',
    poolIds: [
      'b8d0d351-ac04-40de-9768-1fb9fdc68114',
      '4e11cab6-afe4-5785-ac9d-cf3b46dc67f7',
      '7d491f26-a03b-4eca-ae2c-e068391b15d3',
      'ebb3a954-fd67-4a3b-ac2f-3a8c7be9200b'
    ]
  },
  dolomite: {
    protocol: 'Dolomite',
    type: 'LENDING_SUPPLY',
    poolIds: ['20e45c3e-7de7-4d34-89e7-20858ecdf252']
  },
  'yearn-finance': {
    protocol: 'Yearn',
    type: 'CURATED_VAULT',
    poolIds: ['7d89af7a-24c9-4292-aa38-7c71b05fbd6d']
  }
}

const DYNAMIC_ETHEREUM_PROTOCOLS = new Set([
  'Aave',
  'Spark',
  'Compound',
  'Morpho Blue',
  'Fluid'
])

const REGISTERED_DISCOVERY_POOL_IDS = new Set(
  Object.values(DEFILLAMA_DISCOVERY_PRODUCTS).flatMap(product => [...(product.poolIds ?? [])])
)

export function isRegisteredDiscoveryPool (project: string, poolId: string): boolean {
  const product = DEFILLAMA_DISCOVERY_PRODUCTS[project]
  return product !== undefined && (product.poolIds === undefined || product.poolIds.includes(poolId))
}

export function isPositionReadableOpportunity (opportunity: Pick<YieldOpportunity, 'protocol' | 'chain' | 'asset' | 'sourcePoolId'>): boolean {
  if (opportunity.chain !== 'Ethereum') return false
  if (DYNAMIC_ETHEREUM_PROTOCOLS.has(opportunity.protocol)) return true
  return opportunity.asset === 'USDC'
    && opportunity.sourcePoolId !== undefined
    && REGISTERED_DISCOVERY_POOL_IDS.has(opportunity.sourcePoolId)
}

export function attachPositionSupport (opportunity: YieldOpportunity): YieldOpportunity {
  return {
    ...opportunity,
    positionReadable: isPositionReadableOpportunity(opportunity)
  }
}
