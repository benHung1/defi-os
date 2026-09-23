import assert from 'node:assert/strict'
import test from 'node:test'
import { Interface } from 'ethers'
import { compoundPositionAdapter } from '../server/providers/positions/compound.ts'
import { dolomitePositionAdapter } from '../server/providers/positions/dolomite.ts'
import { readErc4626Position } from '../server/providers/positions/erc4626.ts'
import { fluidPositionAdapter } from '../server/providers/positions/fluid.ts'
import { maplePositionAdapter } from '../server/providers/positions/maple.ts'
import { midasPositionAdapter } from '../server/providers/positions/midas.ts'
import { paretoPositionAdapter } from '../server/providers/positions/pareto.ts'
import { sentoraPositionAdapter } from '../server/providers/positions/sentora.ts'
import { sparkSavingsPositionAdapter } from '../server/providers/positions/sparkSavings.ts'
import { yearnPositionAdapter } from '../server/providers/positions/yearn.ts'

const USER = '0x1111111111111111111111111111111111111111'
const USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
const ERC4626_VAULT = '0x2222222222222222222222222222222222222222'
const FUSDC = '0x9fb7b4477576fe5b32be4c1843afb1e55f251b33'
const MAPLE = '0x80ac24aa929eaf5013f6436cda2a7ba190f5cc0b'
const DOLOMITE = '0x444868b6e8079ac2c55eea115250f92c2b2c4d14'
const SPARK_SAVINGS = '0x28b3a8fb53b741a8fd78c0fb9a6b2393d896a43d'
const COMPOUND = '0xc3d688b66703497daa19211eedff47f25384cdc3'

const erc4626Interface = new Interface([
  'function balanceOf(address account) view returns (uint256)',
  'function convertToAssets(uint256 shares) view returns (uint256)'
])
const compoundInterface = new Interface([
  'function balanceOf(address account) view returns (uint256)',
  'function borrowBalanceOf(address account) view returns (uint256)',
  'function collateralBalanceOf(address account,address asset) view returns (uint128)'
])
const legacyYearnInterface = new Interface([
  'function balanceOf(address account) view returns (uint256)',
  'function pricePerShare() view returns (uint256)'
])
const paretoInterface = new Interface([
  'function balanceOf(address account) view returns (uint256)',
  'function virtualPrice(address tranche) view returns (uint256)'
])
const feedInterface = new Interface(['function getDataInBase18() view returns (uint256)'])

function uintResult (value: bigint): Response {
  return Response.json({ jsonrpc: '2.0', id: 1, result: `0x${value.toString(16).padStart(64, '0')}` })
}

function rpcCall (init?: RequestInit): { to: string, data: string } {
  const body = JSON.parse(String(init?.body)) as { params: Array<{ to: string, data: string }> }
  return {
    to: body.params[0]!.to.toLowerCase(),
    data: body.params[0]!.data.toLowerCase()
  }
}

async function withFetchMock<T> (mock: typeof fetch, run: () => Promise<T>): Promise<T> {
  const original = globalThis.fetch
  globalThis.fetch = mock
  try {
    return await run()
  } finally {
    globalThis.fetch = original
  }
}

function erc4626RpcMock (vault: string, shares = 2_000_000n, assets = 2_100_000n): typeof fetch {
  return async (_input, init) => {
    const { to, data } = rpcCall(init)
    assert.equal(to, vault.toLowerCase())
    if (data.startsWith(erc4626Interface.getFunction('balanceOf')!.selector)) return uintResult(shares)
    if (data.startsWith(erc4626Interface.getFunction('convertToAssets')!.selector)) return uintResult(assets)
    throw new Error(`Unexpected ERC-4626 call ${data.slice(0, 10)}`)
  }
}

test('ERC-4626 reader converts shares to underlying assets', async () => {
  const position = await withFetchMock(erc4626RpcMock(ERC4626_VAULT), () => readErc4626Position(USER, {
    protocol: 'Test',
    product: 'Test Vault',
    vaultAddress: ERC4626_VAULT,
    asset: 'USDC',
    assetAddress: USDC,
    assetDecimals: 6
  }))
  assert.equal(position?.amount, 2.1)
  assert.notEqual(position?.amount, 2)
  assert.equal(position?.verification, 'ONCHAIN')
})

test('ERC-4626 reader skips zero shares without requesting a conversion', async () => {
  let callCount = 0
  const mock: typeof fetch = async (_input, init) => {
    callCount += 1
    const { data } = rpcCall(init)
    assert.ok(data.startsWith(erc4626Interface.getFunction('balanceOf')!.selector))
    return uintResult(0n)
  }
  const position = await withFetchMock(mock, () => readErc4626Position(USER, {
    protocol: 'Test', product: 'Test Vault', vaultAddress: ERC4626_VAULT,
    asset: 'USDC', assetAddress: USDC, assetDecimals: 6
  }))
  assert.equal(position, null)
  assert.equal(callCount, 1)
})

test('Compound adapter separates supply, borrow, and collateral decimals', async () => {
  const mock: typeof fetch = async (_input, init) => {
    const { to, data } = rpcCall(init)
    assert.equal(to, COMPOUND)
    if (data === '0x7eb71131') return uintResult(0n)
    if (data.startsWith('0xd955759d')) return uintResult(1_000_000_000n)
    if (data === '0x18160ddd') return uintResult(1_000_000_000n)
    if (data.startsWith(compoundInterface.getFunction('balanceOf')!.selector)) return uintResult(1_250_000_000n)
    if (data.startsWith(compoundInterface.getFunction('borrowBalanceOf')!.selector)) return uintResult(250_000_000n)
    if (data.startsWith(compoundInterface.getFunction('collateralBalanceOf')!.selector)) {
      return uintResult(data.includes('c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2') ? 2_000_000_000_000_000_000n : 0n)
    }
    throw new Error(`Unexpected Compound call ${data.slice(0, 10)}`)
  }
  const result = await withFetchMock(mock, () => compoundPositionAdapter.getPositions(USER))
  assert.deepEqual(result.warnings, [])
  assert.deepEqual(result.positions.map(position => [position.kind, position.asset, position.amount]), [
    ['SUPPLY', 'USDC', 1250],
    ['BORROW', 'USDC', 250],
    ['COLLATERAL', 'WETH', 2]
  ])
})

test('Spark Savings adapter converts vault shares instead of reporting receipt tokens', async () => {
  const mock: typeof fetch = async (_input, init) => {
    const { to, data } = rpcCall(init)
    assert.equal(to, SPARK_SAVINGS)
    if (data.startsWith(erc4626Interface.getFunction('balanceOf')!.selector)) return uintResult(2_000_000n)
    if (data.startsWith(erc4626Interface.getFunction('convertToAssets')!.selector)) return uintResult(2_100_000n)
    if (data === '0x1e7b14d3') return uintResult(10n ** 27n)
    if (data === '0x01e1d114') return uintResult(1_000_000_000n)
    throw new Error(`Unexpected Spark Savings call ${data.slice(0, 10)}`)
  }
  const result = await withFetchMock(mock, () => sparkSavingsPositionAdapter.getPositions(USER))
  assert.equal(result.positions[0]?.amount, 2.1)
  assert.equal(result.positions[0]?.rateType, 'APY')
  assert.equal(result.positions[0]?.verification, 'ONCHAIN')
})

test('Fluid adapter combines verified ERC-4626 assets with the official market rate', async () => {
  const mock: typeof fetch = async (input, init) => {
    if (String(input).includes('api.fluid.instadapp.io')) {
      return Response.json({ data: [{
        address: FUSDC,
        asset: { symbol: 'USDC', decimals: 6, price: 1 },
        totalAssets: '1000000000',
        totalRate: '469'
      }] })
    }
    return erc4626RpcMock(FUSDC)(input, init)
  }
  const result = await withFetchMock(mock, () => fluidPositionAdapter.getPositions(USER))
  assert.equal(result.positions[0]?.amount, 2.1)
  assert.equal(result.positions[0]?.rate, 4.69)
  assert.equal(result.positions[0]?.rateType, 'APR')
})

test('Maple adapter retains the on-chain position when its rate API succeeds', async () => {
  const mock: typeof fetch = async (input, init) => {
    if (String(input).includes('api.maple.finance')) {
      return Response.json({ data: { poolV2: { monthlyApy: '50000000000000000000000000000' } } })
    }
    return erc4626RpcMock(MAPLE)(input, init)
  }
  const result = await withFetchMock(mock, () => maplePositionAdapter.getPositions(USER))
  assert.equal(result.positions[0]?.amount, 2.1)
  assert.equal(result.positions[0]?.rate, 5)
  assert.equal(result.positions[0]?.rateType, 'APY')
  assert.deepEqual(result.warnings, [])
})

test('Dolomite adapter reports converted underlying USDC', async () => {
  const result = await withFetchMock(erc4626RpcMock(DOLOMITE), () => dolomitePositionAdapter.getPositions(USER))
  assert.equal(result.positions[0]?.protocol, 'Dolomite')
  assert.equal(result.positions[0]?.amount, 2.1)
  assert.equal(result.positions[0]?.asset, 'USDC')
})

test('Yearn adapter handles V3 convertToAssets and legacy pricePerShare', async () => {
  const v3 = '0x3333333333333333333333333333333333333333'
  const legacy = '0x4444444444444444444444444444444444444444'
  const mock: typeof fetch = async (input, init) => {
    if (String(input).includes('ydaemon.yearn.fi')) {
      const common = { endorsed: true, emergency_shutdown: false, tvl: { tvl: 1 }, details: {}, token: { address: USDC, decimals: 6 } }
      return Response.json([
        { ...common, address: v3, name: 'Yearn V3 USDC', version: '3.0.4', decimals: 6, apr: { netAPR: 0.05 } },
        { ...common, address: legacy, name: 'Yearn V2 USDC', version: '2.0.0', decimals: 6, apr: { netAPR: 0.04 }, details: { isRetired: true } }
      ])
    }
    const { to, data } = rpcCall(init)
    if (to === v3 && data.startsWith(erc4626Interface.getFunction('balanceOf')!.selector)) return uintResult(2_000_000n)
    if (to === v3 && data.startsWith(erc4626Interface.getFunction('convertToAssets')!.selector)) return uintResult(2_100_000n)
    if (to === legacy && data.startsWith(legacyYearnInterface.getFunction('balanceOf')!.selector)) return uintResult(3_000_000n)
    if (to === legacy && data.startsWith(legacyYearnInterface.getFunction('pricePerShare')!.selector)) return uintResult(1_100_000n)
    throw new Error(`Unexpected Yearn call ${to} ${data.slice(0, 10)}`)
  }
  const result = await withFetchMock(mock, () => yearnPositionAdapter.getPositions(USER))
  assert.deepEqual(result.positions.map(position => [position.product, position.amount, position.rate]), [
    ['Yearn V3 USDC', 2.1, 5],
    ['Yearn V2 USDC', 3.3, 4]
  ])
  assert.deepEqual(result.warnings, [])
})

test('Yearn adapter keeps a retired vault position and does not turn a missing APR into zero', async () => {
  const legacy = '0x4444444444444444444444444444444444444444'
  const mock: typeof fetch = async (input, init) => {
    if (String(input).includes('ydaemon.yearn.fi')) {
      return Response.json([{
        address: legacy,
        name: 'Retired USDC Vault',
        version: '2.0.0',
        decimals: 6,
        token: { address: USDC, decimals: 6 },
        apr: { netAPR: null },
        info: { isRetired: true }
      }])
    }
    const { data } = rpcCall(init)
    if (data.startsWith(legacyYearnInterface.getFunction('balanceOf')!.selector)) return uintResult(3_000_000n)
    if (data.startsWith(legacyYearnInterface.getFunction('pricePerShare')!.selector)) return uintResult(1_100_000n)
    throw new Error(`Unexpected retired Yearn call ${data.slice(0, 10)}`)
  }
  const result = await withFetchMock(mock, () => yearnPositionAdapter.getPositions(USER))
  assert.equal(result.positions[0]?.amount, 3.3)
  assert.equal(result.positions[0]?.rate, null)
  assert.equal(result.positions[0]?.rateType, null)
})

test('Pareto adapter combines active tranche value and pending underlying assets', async () => {
  const falconLp = '0xc26a6fa2c37b38e549a4a1807543801db684f99c'
  const falconStrategy = '0x17e9ab2992dfecbe779a06a92a6cdb9fe6aeeef3'
  const falconVault = '0x433d5b175148da32ffe1e1a37a939e1b7e79be4d'
  const mock: typeof fetch = async (_input, init) => {
    const { to, data } = rpcCall(init)
    if (data.startsWith(paretoInterface.getFunction('balanceOf')!.selector)) {
      if (to === falconLp) return uintResult(2_000_000_000_000_000_000n)
      if (to === falconStrategy) return uintResult(100_000n)
      return uintResult(0n)
    }
    if (to === falconVault && data.startsWith(paretoInterface.getFunction('virtualPrice')!.selector)) return uintResult(1_050_000n)
    throw new Error(`Unexpected Pareto call ${to} ${data.slice(0, 10)}`)
  }
  const result = await withFetchMock(mock, () => paretoPositionAdapter.getPositions(USER))
  assert.equal(result.positions.length, 1)
  assert.equal(result.positions[0]?.product, 'FalconX')
  assert.equal(result.positions[0]?.amount, 2.2)
})

test('Midas adapter values receipt tokens with its official on-chain feed', async () => {
  const mtbill = '0xdd629e5241cbc5919847783e6c96b2de4754e438'
  const mtbillFeed = '0xfcee9754e8c375e145303b7ce7beca3201734a2b'
  const mock: typeof fetch = async (_input, init) => {
    const { to, data } = rpcCall(init)
    if (data.startsWith(erc4626Interface.getFunction('balanceOf')!.selector)) {
      return uintResult(to === mtbill ? 2_000_000_000_000_000_000n : 0n)
    }
    if (to === mtbillFeed && data.startsWith(feedInterface.getFunction('getDataInBase18')!.selector)) {
      return uintResult(1_050_000_000_000_000_000n)
    }
    throw new Error(`Unexpected Midas call ${to} ${data.slice(0, 10)}`)
  }
  const result = await withFetchMock(mock, () => midasPositionAdapter.getPositions(USER))
  assert.equal(result.positions.length, 1)
  assert.equal(result.positions[0]?.amount, 2)
  assert.equal(result.positions[0]?.valueUsd, 2.1)
  assert.equal(result.positions[0]?.verification, 'ONCHAIN')
})

test('Sentora adapter applies the indexed share ratio to the on-chain receipt balance', async () => {
  const receipt = '0xe8aa1a9ec6b9bc455d8f33e4bdc685dedff82407'
  const mock: typeof fetch = async (input, init) => {
    if (String(input).includes('api.upshift.finance')) {
      return Response.json({
        historical_apy: { 30: 0.05 },
        historical_snapshots: [
          { asset_share_ratio: 1.04, snapshot_datetime: '2026-01-01T00:00:00Z' },
          { asset_share_ratio: 1.05, snapshot_datetime: '2026-02-01T00:00:00Z' }
        ]
      })
    }
    const { to, data } = rpcCall(init)
    assert.equal(to, receipt)
    assert.ok(data.startsWith(erc4626Interface.getFunction('balanceOf')!.selector))
    return uintResult(2_000_000n)
  }
  const result = await withFetchMock(mock, () => sentoraPositionAdapter.getPositions(USER))
  assert.equal(result.positions[0]?.amount, 2.1)
  assert.equal(result.positions[0]?.valueUsd, 2.1)
  assert.equal(result.positions[0]?.rate, 5)
  assert.equal(result.positions[0]?.verification, 'INDEXER_ONCHAIN_VERIFIED')
})
