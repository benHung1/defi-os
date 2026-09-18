import type { ChainEventSeverity, ChainEventType } from '../../../shared/types/chainEvents'

const ASSET_PATTERNS: Array<[string, RegExp]> = [
  ['USDC', /\busdc\b/i],
  ['USDT', /\busdt\b/i],
  ['ETH', /\b(?:eth|weth|steth|wsteth)\b/i],
  ['BTC', /\b(?:btc|wbtc|lbtc|cbbtc)\b/i]
]

const CHAIN_PATTERNS: Array<[string, RegExp]> = [
  ['Ethereum', /\b(?:ethereum|mainnet)\b/i],
  ['Arbitrum', /\barbitrum\b/i],
  ['Base', /\bbase\b/i],
  ['Optimism', /\boptimism\b/i],
  ['Polygon PoS', /\bpolygon\b/i],
  ['Avalanche', /\bavalanche\b/i],
  ['BNB Chain', /\b(?:bnb|binance smart chain)\b/i],
  ['Gnosis', /\bgnosis\b/i],
  ['Linea', /\blinea\b/i],
  ['Scroll', /\bscroll\b/i],
  ['Sonic', /\bsonic\b/i],
  ['X Layer', /\bx[ -]?layer\b/i],
  ['Monad', /\bmonad\b/i],
  ['Plasma', /\bplasma\b/i],
  ['MegaETH', /\bmegaeth\b/i],
  ['Arc', /\barc\b/i]
]

export function detectEventAssets (text: string): string[] {
  return ASSET_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([asset]) => asset)
}

export function detectEventChains (text: string): string[] {
  return CHAIN_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([chain]) => chain)
}

export function classifyEventTitle (title: string): { type: ChainEventType, severity: ChainEventSeverity } {
  if (/incident|exploit|hack|vulnerab|reimburse|attack/i.test(title)) {
    return { type: 'SECURITY', severity: 'CRITICAL' }
  }
  if (/pause|freeze|deprecat|offboard|wind(?:ing)? down|shutdown|kill switch/i.test(title)) {
    return { type: 'PAUSE', severity: 'WATCH' }
  }
  if (/upgrade|migration|activation|launch|implementation|spell/i.test(title)) {
    return { type: 'UPGRADE', severity: 'WATCH' }
  }
  return { type: 'GOVERNANCE', severity: 'INFO' }
}

export function isRecentTimestamp (timestampSeconds: number, days = 45): boolean {
  const timestampMs = timestampSeconds * 1000
  return Number.isFinite(timestampMs)
    && timestampMs <= Date.now() + 5 * 60 * 1000
    && timestampMs >= Date.now() - days * 24 * 60 * 60 * 1000
}

export function isMaterialGovernanceTitle (title: string): boolean {
  return /security|incident|pause|freeze|deprecat|offboard|upgrade|migration|activation|launch|parameter|rate|risk|oracle|collateral|liquidity|market|vault|adapter|incentive|usdc|usdt|eth|btc/i.test(title)
}
