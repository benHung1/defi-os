const PRICE_API = 'https://coins.llama.fi/prices/current'

interface PricePayload {
  coins?: Record<string, { price?: unknown }>
}

const COIN_KEYS: Record<string, string> = {
  ETH: 'coingecko:ethereum',
  USDC: 'ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  USDT: 'ethereum:0xdac17f958d2ee523a2206206994597c13d831ec7',
  WBTC: 'ethereum:0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'
}

export async function getUsdPrices (symbols: string[]): Promise<Record<string, number>> {
  const requested = [...new Set(symbols)].filter(symbol => COIN_KEYS[symbol])
  if (requested.length === 0) return {}

  const keys = requested.map(symbol => COIN_KEYS[symbol]).join(',')
  const response = await fetch(`${PRICE_API}/${keys}`, { signal: AbortSignal.timeout(10_000) })
  if (!response.ok) throw new Error(`DefiLlama price API returned HTTP ${response.status}`)

  const payload = await response.json() as PricePayload
  return Object.fromEntries(requested.flatMap((symbol) => {
    const key = COIN_KEYS[symbol]
    const price = key ? payload.coins?.[key]?.price : undefined
    return typeof price === 'number' && Number.isFinite(price) ? [[symbol, price]] : []
  }))
}
