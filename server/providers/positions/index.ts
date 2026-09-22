import { aaveEthereumPositionAdapter, sparkLendPositionAdapter } from './aaveV3.ts'
import { compoundPositionAdapter } from './compound.ts'
import { dolomitePositionAdapter } from './dolomite.ts'
import { fluidPositionAdapter } from './fluid.ts'
import { maplePositionAdapter } from './maple.ts'
import { midasPositionAdapter } from './midas.ts'
import { morphoPositionAdapter } from './morpho.ts'
import { paretoPositionAdapter } from './pareto.ts'
import { POSITION_ADAPTER_KEYS, type PositionAdapterKey } from '../../productRegistry.ts'
import { sentoraPositionAdapter } from './sentora.ts'
import { sparkSavingsPositionAdapter } from './sparkSavings.ts'
import type { ProtocolPositionAdapter, ProtocolPositionResult } from './types.ts'
import { yearnPositionAdapter } from './yearn.ts'

export const POSITION_ADAPTERS: Record<PositionAdapterKey, ProtocolPositionAdapter> = {
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

const adapters = POSITION_ADAPTER_KEYS.map(key => POSITION_ADAPTERS[key])

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
