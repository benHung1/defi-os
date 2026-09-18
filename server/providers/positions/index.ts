import { aaveEthereumPositionAdapter, sparkLendPositionAdapter } from './aaveV3'
import { compoundPositionAdapter } from './compound'
import { fluidPositionAdapter } from './fluid'
import { maplePositionAdapter } from './maple'
import { morphoPositionAdapter } from './morpho'
import { sparkSavingsPositionAdapter } from './sparkSavings'
import type { ProtocolPositionResult } from './types'
import { yearnPositionAdapter } from './yearn'

const adapters = [
  aaveEthereumPositionAdapter,
  sparkLendPositionAdapter,
  sparkSavingsPositionAdapter,
  compoundPositionAdapter,
  morphoPositionAdapter,
  fluidPositionAdapter,
  maplePositionAdapter,
  yearnPositionAdapter
]

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
