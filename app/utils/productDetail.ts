import type { PortfolioPosition } from '../../shared/types/portfolio'

export interface ProductDetailReference {
  protocol: string
  product: string
  chain: string
  asset: string
  sourcePoolId?: string
}

function isProductDetailReference (value: unknown): value is ProductDetailReference {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return ['protocol', 'product', 'chain', 'asset'].every(key =>
    typeof record[key] === 'string' && record[key].trim().length > 0
  ) && (record.sourcePoolId === undefined || typeof record.sourcePoolId === 'string')
}

export function encodeProductDetailId (reference: ProductDetailReference): string {
  const bytes = new TextEncoder().encode(JSON.stringify(reference))
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

export function decodeProductDetailId (id: string): ProductDetailReference | null {
  if (!/^[0-9a-f]+$/i.test(id) || id.length % 2 !== 0 || id.length > 4096) return null

  try {
    const bytes = new Uint8Array(id.match(/.{2}/g)!.map(value => Number.parseInt(value, 16)))
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes))
    if (!isProductDetailReference(parsed)) return null
    return {
      protocol: parsed.protocol.trim(),
      product: parsed.product.trim(),
      chain: parsed.chain.trim(),
      asset: parsed.asset.trim().toUpperCase(),
      sourcePoolId: parsed.sourcePoolId?.trim() || undefined
    }
  } catch {
    return null
  }
}

export function productDetailPath (reference: ProductDetailReference): string {
  return `/products/${encodeProductDetailId(reference)}`
}

export function portfolioPositionDetailReference (position: PortfolioPosition): ProductDetailReference {
  const asset = position.asset.toUpperCase()
  const aaveProductSuffix = ` ${asset}`
  const isAave = position.protocol.toLowerCase() === 'aave'

  return {
    protocol: position.protocol,
    product: isAave && !position.product.toUpperCase().endsWith(aaveProductSuffix)
      ? `${position.product} ${asset}`
      : position.product,
    chain: position.chain,
    asset,
    sourcePoolId: isAave ? undefined : position.contractAddress
  }
}
