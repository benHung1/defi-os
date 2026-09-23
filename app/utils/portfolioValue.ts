import type { PortfolioPosition } from '../../shared/types/portfolio'

export function signedPositionUsdValue (
  position: Pick<PortfolioPosition, 'kind' | 'valueUsd'>
): number | null {
  if (position.valueUsd === null) return null
  return position.kind === 'BORROW' ? -position.valueUsd : position.valueUsd
}
