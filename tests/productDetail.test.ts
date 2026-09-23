import assert from 'node:assert/strict'
import test from 'node:test'
import { decodeProductDetailId, encodeProductDetailId, portfolioPositionDetailReference, productDetailPath } from '../app/utils/productDetail.ts'

test('round-trips a unicode product identity', () => {
  const reference = {
    protocol: 'Morpho Blue',
    product: 'Steakhouse USDC Vault 測試',
    chain: 'Ethereum',
    asset: 'USDC',
    sourcePoolId: '0x1234'
  }

  assert.deepEqual(decodeProductDetailId(encodeProductDetailId(reference)), reference)
})

test('rejects malformed product identities', () => {
  assert.equal(decodeProductDetailId('not-hex'), null)
  assert.equal(decodeProductDetailId('7b7d'), null)
})

test('builds an internal product detail route', () => {
  const path = productDetailPath({ protocol: 'Aave', product: 'Core USDC', chain: 'Ethereum', asset: 'USDC' })
  assert.match(path, /^\/products\/[0-9a-f]+$/)
})

test('normalizes an Aave portfolio position to the market product identity', () => {
  const reference = portfolioPositionDetailReference({
    protocol: 'Aave',
    product: 'Aave V3 Ethereum Core',
    kind: 'SUPPLY',
    chain: 'Ethereum',
    asset: 'USDC',
    amount: 100,
    valueUsd: 100,
    rate: 3.5,
    rateType: 'APY',
    contractAddress: '0xDataProvider',
    assetAddress: '0xUsdc',
    verification: 'ONCHAIN',
    verifiedAt: '2026-09-23T00:00:00.000Z'
  })

  assert.deepEqual(reference, {
    protocol: 'Aave',
    product: 'Aave V3 Ethereum Core USDC',
    chain: 'Ethereum',
    asset: 'USDC',
    sourcePoolId: undefined
  })
})
