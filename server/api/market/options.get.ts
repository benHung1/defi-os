import { MARKET_ASSETS, MARKET_CHAINS } from '../../marketRegistry'

export default defineEventHandler(() => ({
  chains: MARKET_CHAINS.map(chain => ({
    key: chain.key,
    label: chain.label,
    symbol: chain.symbol,
    group: chain.group,
    assets: chain.assets
  })),
  assets: MARKET_ASSETS
}))
