import type { PortfolioPosition } from '../../../shared/types/portfolio'

export interface ProtocolPositionResult {
  positions: PortfolioPosition[]
  warnings: string[]
}

export interface ProtocolPositionAdapter {
  name: string
  getPositions: (address: string) => Promise<ProtocolPositionResult>
}
