import assert from 'node:assert/strict'
import test from 'node:test'
import { Interface } from 'ethers'
import { aaveEthereumPositionAdapter, sparkLendPositionAdapter } from '../server/providers/positions/aaveV3.ts'
import { morphoPositionAdapter } from '../server/providers/positions/morpho.ts'

const USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
const USER = '0x1111111111111111111111111111111111111111'
const aaveInterface = new Interface([
  'function getAllReservesTokens() view returns (tuple(string symbol,address tokenAddress)[])',
  'function getUserReserveData(address asset,address user) view returns (uint256 currentATokenBalance,uint256 currentStableDebt,uint256 currentVariableDebt,uint256 principalStableDebt,uint256 scaledVariableDebt,uint256 stableBorrowRate,uint256 liquidityRate,uint40 stableRateLastUpdated,bool usageAsCollateralEnabled)'
])
const decimalsInterface = new Interface(['function decimals() view returns (uint8)'])
const vaultInterface = new Interface([
  'function balanceOf(address account) view returns (uint256)',
  'function convertToAssets(uint256 shares) view returns (uint256)'
])

function rpcResponse (result: string): Response {
  return Response.json({ jsonrpc: '2.0', id: 1, result })
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

function aaveRpcMock (): typeof fetch {
  return async (_input, init) => {
    const body = JSON.parse(String(init?.body)) as { params: Array<{ data: string }> }
    const data = body.params[0]!.data
    if (data.startsWith(aaveInterface.getFunction('getAllReservesTokens')!.selector)) {
      return rpcResponse(aaveInterface.encodeFunctionResult('getAllReservesTokens', [[['USDC', USDC]]]))
    }
    if (data.startsWith(aaveInterface.getFunction('getUserReserveData')!.selector)) {
      return rpcResponse(aaveInterface.encodeFunctionResult('getUserReserveData', [
        1_000_000_000n, 0n, 0n, 0n, 0n, 0n, 30_000_000_000_000_000_000_000_000n, 0n, true
      ]))
    }
    if (data.startsWith(decimalsInterface.getFunction('decimals')!.selector)) {
      return rpcResponse(decimalsInterface.encodeFunctionResult('decimals', [6]))
    }
    throw new Error(`Unexpected RPC call ${data.slice(0, 10)}`)
  }
}

for (const adapter of [aaveEthereumPositionAdapter, sparkLendPositionAdapter]) {
  test(`${adapter.name} adapter converts the verified USDC reserve balance`, async () => {
    const result = await withFetchMock(aaveRpcMock(), () => adapter.getPositions(USER))
    assert.deepEqual(result.warnings, [])
    assert.equal(result.positions.length, 1)
    assert.equal(result.positions[0]?.protocol, adapter.name)
    assert.equal(result.positions[0]?.amount, 1000)
    assert.equal(result.positions[0]?.asset, 'USDC')
    assert.equal(result.positions[0]?.verification, 'ONCHAIN')
    assert.equal(result.positions[0]?.isCollateral, true)
  })
}

test('Morpho vault uses convertToAssets instead of treating shares as assets', async () => {
  const mock: typeof fetch = async (input, init) => {
    if (String(input).includes('api.morpho.org')) {
      return Response.json({
        data: {
          userByAddress: {
            marketPositions: [],
            vaultPositions: [{
              vault: {
                address: '0x2222222222222222222222222222222222222222',
                name: 'Test USDC Vault',
                asset: { address: USDC, symbol: 'USDC', decimals: 6 },
                state: { netApy: 0.052 }
              },
              state: { shares: '2000000', assets: '2100000', assetsUsd: 2.1 }
            }]
          }
        }
      })
    }

    const body = JSON.parse(String(init?.body)) as { params: Array<{ data: string }> }
    const data = body.params[0]!.data
    if (data.startsWith(vaultInterface.getFunction('balanceOf')!.selector)) {
      return rpcResponse(vaultInterface.encodeFunctionResult('balanceOf', [2_000_000n]))
    }
    if (data.startsWith(vaultInterface.getFunction('convertToAssets')!.selector)) {
      return rpcResponse(vaultInterface.encodeFunctionResult('convertToAssets', [2_100_000n]))
    }
    throw new Error(`Unexpected Morpho call ${data.slice(0, 10)}`)
  }

  const result = await withFetchMock(mock, () => morphoPositionAdapter.getPositions(USER))
  assert.deepEqual(result.warnings, [])
  assert.equal(result.positions.length, 1)
  assert.equal(result.positions[0]?.kind, 'VAULT')
  assert.equal(result.positions[0]?.amount, 2.1)
  assert.notEqual(result.positions[0]?.amount, 2)
  assert.equal(result.positions[0]?.verification, 'INDEXER_ONCHAIN_VERIFIED')
})

test('Morpho treats an unknown address as an empty portfolio, not a provider failure', async () => {
  const mock: typeof fetch = async () => Response.json({ data: { userByAddress: null } })
  const result = await withFetchMock(mock, () => morphoPositionAdapter.getPositions(USER))
  assert.deepEqual(result, { positions: [], warnings: [] })
})

test('Morpho skips indexer-confirmed dust before making vault RPC calls', async () => {
  const mock: typeof fetch = async (input) => {
    if (!String(input).includes('api.morpho.org')) throw new Error('Dust must not trigger an RPC read')
    return Response.json({
      data: {
        userByAddress: {
          marketPositions: [],
          vaultPositions: [{
            vault: {
              address: '0x2222222222222222222222222222222222222222',
              name: 'Dust Vault',
              asset: { address: USDC, symbol: 'USDC', decimals: 6 },
              state: { netApy: 0.05 }
            },
            state: { shares: '1', assets: '1', assetsUsd: 0.000001 }
          }]
        }
      }
    })
  }
  const result = await withFetchMock(mock, () => morphoPositionAdapter.getPositions(USER))
  assert.deepEqual(result, { positions: [], warnings: [] })
})
