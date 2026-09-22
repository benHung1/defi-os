import { POSITION_ADAPTER_KEYS, type PositionAdapterKey } from '../server/productRegistry.ts'
import { POSITION_ADAPTERS } from '../server/providers/positions/index.ts'

const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/
const address = process.argv.slice(2).find(value => EVM_ADDRESS.test(value))
const full = process.argv.includes('--full')
const adapterArgumentIndex = process.argv.indexOf('--adapter')
const requestedAdapter = adapterArgumentIndex >= 0 ? process.argv[adapterArgumentIndex + 1] : undefined
const isAdapterKey = (value: string | undefined): value is PositionAdapterKey =>
  value !== undefined && POSITION_ADAPTER_KEYS.includes(value as PositionAdapterKey)

if (!address || !EVM_ADDRESS.test(address) || (requestedAdapter !== undefined && !isAdapterKey(requestedAdapter))) {
  console.error('Usage: pnpm verify:positions -- 0x<public Ethereum address> [--adapter <adapter-key>] [--full]')
  console.error(`Adapter keys: ${POSITION_ADAPTER_KEYS.join(', ')}`)
  process.exitCode = 1
} else {
  const adapterKeys = requestedAdapter ? [requestedAdapter] : POSITION_ADAPTER_KEYS
  const adapters = adapterKeys.map(key => ({ key, adapter: POSITION_ADAPTERS[key] }))
  const results = await Promise.allSettled(adapters.map(async ({ key, adapter }) => ({
    adapterKey: key,
    protocol: adapter.name,
    ...await adapter.getPositions(address.toLowerCase())
  })))

  const report = results.map((result, index) => result.status === 'fulfilled'
    ? (() => {
        const warnings = [...new Set(result.value.warnings)]
        return {
          adapterKey: result.value.adapterKey,
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
        adapterKey: adapters[index]!.key,
        protocol: adapters[index]!.adapter.name,
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
    note: 'Every reported position is backed by a protocol contract balance or share conversion. Some adapters use an official API or indexer for discovery, rates, or share metadata.',
    adapters: report
  }, null, 2))

  if (results.every(result => result.status === 'rejected')) process.exitCode = 2
}
