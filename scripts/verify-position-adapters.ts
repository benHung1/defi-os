import { aaveEthereumPositionAdapter, sparkLendPositionAdapter } from '../server/providers/positions/aaveV3.ts'
import { morphoPositionAdapter } from '../server/providers/positions/morpho.ts'

const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/
const address = process.argv.slice(2).find(value => EVM_ADDRESS.test(value))
const full = process.argv.includes('--full')

if (!address || !EVM_ADDRESS.test(address)) {
  console.error('Usage: pnpm verify:positions -- 0x<public Ethereum address>')
  process.exitCode = 1
} else {
  const adapters = [aaveEthereumPositionAdapter, morphoPositionAdapter, sparkLendPositionAdapter]
  const results = await Promise.allSettled(adapters.map(async adapter => ({
    protocol: adapter.name,
    ...await adapter.getPositions(address.toLowerCase())
  })))

  const report = results.map((result, index) => result.status === 'fulfilled'
    ? (() => {
        const warnings = [...new Set(result.value.warnings)]
        return {
          protocol: result.value.protocol,
          status: warnings.length > 0 ? 'partial' : 'verified',
          positionCount: result.value.positions.length,
          positions: full ? result.value.positions : result.value.positions.slice(0, 10),
          omittedPositionCount: full ? 0 : Math.max(0, result.value.positions.length - 10),
          warningCount: result.value.warnings.length,
          warnings: full ? result.value.warnings : warnings.slice(0, 10)
        }
      })()
    : {
        protocol: adapters[index]!.name,
        status: 'error',
        positionCount: 0,
        positions: [],
        omittedPositionCount: 0,
        warningCount: 1,
        warnings: [result.reason instanceof Error ? result.reason.message : String(result.reason)]
      })

  console.log(JSON.stringify({
    address: address.toLowerCase(),
    checkedAt: new Date().toISOString(),
    note: 'Aave and Spark are read directly from protocol contracts. Morpho discovery metadata is verified against onchain shares/balances before output.',
    adapters: report
  }, null, 2))

  if (results.every(result => result.status === 'rejected')) process.exitCode = 2
}
