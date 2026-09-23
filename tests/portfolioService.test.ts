import assert from 'node:assert/strict'
import test from 'node:test'
import { signedPositionUsdValue } from '../app/utils/portfolioValue.ts'
import { buildPortfolioResponse, type PortfolioInputs } from '../server/services/portfolioBuilder.ts'

const ADDRESS = '0x0000000000000000000000000000000000000001'

function inputs (): PortfolioInputs {
  return {
    balances: {
      assets: [{
        symbol: 'USDC',
        name: 'USD Coin',
        kind: 'ERC20',
        chain: 'Ethereum',
        amount: 500,
        priceUsd: null,
        valueUsd: null,
        contractAddress: '0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
      }],
      warnings: []
    },
    protocolPositions: {
      positions: [{
        protocol: 'Aave',
        product: 'Aave V3 Ethereum Core',
        kind: 'SUPPLY',
        chain: 'Ethereum',
        asset: 'USDC',
        amount: 1000,
        valueUsd: null,
        rate: 3.5,
        rateType: 'APY',
        contractAddress: '0x0000000000000000000000000000000000000002',
        verification: 'ONCHAIN',
        verifiedAt: '2026-09-22T00:00:00.000Z'
      }],
      warnings: []
    },
    prices: { USDC: 1 }
  }
}

test('builds a complete total only when balances, positions, and prices are complete', () => {
  const result = buildPortfolioResponse(ADDRESS, inputs())

  assert.equal(result.summary.totalUsd, 1500)
  assert.equal(result.meta.partial, false)
  assert.deepEqual(result.meta.coverage, {
    balances: 'COMPLETE',
    positions: 'COMPLETE',
    prices: 'COMPLETE'
  })
})

test('marks a missing price response as partial even when the price request did not throw', () => {
  const fixture = inputs()
  fixture.prices = {}
  const result = buildPortfolioResponse(ADDRESS, fixture)

  assert.equal(result.summary.totalUsd, null)
  assert.equal(result.meta.partial, true)
  assert.equal(result.meta.coverage.prices, 'PARTIAL')
  assert.deepEqual(result.meta.warnings, ['USD prices unavailable for USDC'])
})

test('keeps verified positions visible but does not claim a complete total when an adapter failed', () => {
  const fixture = inputs()
  fixture.protocolPositions.warnings.push('Morpho Blue positions unavailable')
  const result = buildPortfolioResponse(ADDRESS, fixture)

  assert.equal(result.positions.length, 1)
  assert.equal(result.summary.totalUsd, null)
  assert.equal(result.meta.coverage.positions, 'PARTIAL')
})

test('a missing rate is partial evidence but does not invalidate a known portfolio value', () => {
  const fixture = inputs()
  fixture.protocolPositions.warnings.push('Maple rate unavailable')
  const result = buildPortfolioResponse(ADDRESS, fixture)

  assert.equal(result.summary.totalUsd, 1500)
  assert.equal(result.meta.partial, true)
  assert.equal(result.meta.coverage.positions, 'PARTIAL')
})

test('uses debt as a negative value in the displayed DeFi subtotal', () => {
  assert.equal(signedPositionUsdValue({ kind: 'SUPPLY', valueUsd: 1000 }), 1000)
  assert.equal(signedPositionUsdValue({ kind: 'BORROW', valueUsd: 250 }), -250)
  assert.equal(signedPositionUsdValue({ kind: 'BORROW', valueUsd: null }), null)
})
