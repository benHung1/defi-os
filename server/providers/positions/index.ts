import { aaveEthereumPositionAdapter, sparkLendPositionAdapter } from './aaveV3'
import { compoundPositionAdapter } from './compound'
import { dolomitePositionAdapter } from './dolomite'
import { fluidPositionAdapter } from './fluid'
import { maplePositionAdapter } from './maple'
import { midasPositionAdapter } from './midas'
import { morphoPositionAdapter } from './morpho'
import { paretoPositionAdapter } from './pareto'
import { POSITION_ADAPTER_KEYS, type PositionAdapterKey } from '../../productRegistry'
import { sentoraPositionAdapter } from './sentora'
import { sparkSavingsPositionAdapter } from './sparkSavings'
import type { ProtocolPositionAdapter, ProtocolPositionResult } from './types'
import { yearnPositionAdapter } from './yearn'

const ADAPTERS: Record<PositionAdapterKey, ProtocolPositionAdapter> = {
  'aave-v3': aaveEthereumPositionAdapter,
  'spark-lend': sparkLendPositionAdapter,
  'spark-savings': sparkSavingsPositionAdapter,
  'compound-v3': compoundPositionAdapter,
  'morpho-blue': morphoPositionAdapter,
  fluid: fluidPositionAdapter,
  maple: maplePositionAdapter,
  yearn: yearnPositionAdapter,
  pareto: paretoPositionAdapter,
  midas: midasPositionAdapter,
  dolomite: dolomitePositionAdapter,
  sentora: sentoraPositionAdapter
}

const adapters = POSITION_ADAPTER_KEYS.map(key => ADAPTERS[key])

export async function getEthereumProtocolPositions (address: string): Promise<ProtocolPositionResult> {
  const settled = await Promise.allSettled(adapters.map(adapter => adapter.getPositions(address)))
  const positions: ProtocolPositionResult['positions'] = []
  const warnings: string[] = []

  settled.forEach((result, index) => {
    const adapter = adapters[index]!
    if (result.status === 'fulfilled') {
      positions.push(...result.value.positions)
      warnings.push(...result.value.warnings)
    } else {
      warnings.push(`${adapter.name} positions unavailable`)
    }
  })

  return { positions, warnings }
}
