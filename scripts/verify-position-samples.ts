import { POSITION_ADAPTER_KEYS, type PositionAdapterKey } from '../server/productRegistry.ts'
import { POSITION_ADAPTERS } from '../server/providers/positions/index.ts'

const BLOCKSCOUT_BASE_URL = 'https://eth.blockscout.com/api/v2/tokens'

// Receipt tokens are discovery hints only. The adapter remains the source of
// truth and must independently return a non-zero, contract-verified position.
const DISCOVERY_TOKENS: Record<PositionAdapterKey, string> = {
  'aave-v3': '0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c',
  'spark-lend': '0x377C3bd93f2a2984E1E7bE6A5C22c525eD4A4815',
  'spark-savings': '0x28B3a8fb53B741A8Fd78c0fb9A6B2393d896a43d',
  'compound-v3': '0xc3d688B66703497DAA19211EEdff47f25384cdc3',
  'morpho-blue': '0xBEEF01735c132Ada46AA9aA4c54623cAA92A64CB',
  fluid: '0x9Fb7b4477576Fe5B32be4C1843aFB1e55F251B33',
  maple: '0x80ac24aA929eaF5013f6436cdA2a7ba190f5Cc0b',
  // This retired V2 vault intentionally proves that existing legacy holdings
  // remain discoverable even though the product is no longer market-admitted.
  yearn: '0xa354F35829Ae975e850e23e9615b11Da1B3dC4DE',
  pareto: '0xC26A6Fa2C37b38E549a4a1807543801Db684f99C',
  midas: '0xDD629E5241CbC5919847783e6C96B2De4754e438',
  dolomite: '0x444868B6e8079ac2c55eea115250f92C2b2c4D14',
  sentora: '0xe8aa1a9ec6b9bc455d8f33e4bdc685dedff82407'
}

interface BlockscoutHolderResponse {
  items?: Array<{
    address?: { hash?: unknown }
    value?: unknown
  }>
}

async function discoverCurrentHolders (token: string): Promise<string[]> {
  const response = await fetch(`${BLOCKSCOUT_BASE_URL}/${token}/holders`, {
    signal: AbortSignal.timeout(15_000)
  })
  if (!response.ok) throw new Error(`Blockscout returned HTTP ${response.status}`)
  const payload = await response.json() as BlockscoutHolderResponse
  const holders = (payload.items ?? []).flatMap(item => {
    const address = item.address?.hash
    return typeof address === 'string'
      && /^0x[0-9a-f]{40}$/i.test(address)
      && Number(item.value) > 0
      ? [address.toLowerCase()]
      : []
  })
  if (holders.length === 0) throw new Error('Blockscout returned no current holder candidates')
  return holders
}

const report = []
let failed = false

for (const adapterKey of POSITION_ADAPTER_KEYS) {
  const adapter = POSITION_ADAPTERS[adapterKey]
  const discoveryToken = DISCOVERY_TOKENS[adapterKey]
  try {
    const candidates = await discoverCurrentHolders(discoveryToken)
    let address: string | null = null
    let result = null
    for (const candidate of candidates.slice(0, 5)) {
      const candidateResult = await adapter.getPositions(candidate)
      if (candidateResult.positions.length === 0) continue
      address = candidate
      result = candidateResult
      break
    }
    const verified = address !== null && result !== null
    failed ||= !verified
    report.push({
      adapterKey,
      protocol: adapter.name,
      status: verified ? (result.warnings.length > 0 ? 'partial' : 'verified') : 'no-position',
      discoveryToken,
      publicAddress: address,
      positionCount: result?.positions.length ?? 0,
      products: result?.positions.map(position => `${position.product} · ${position.kind} · ${position.asset}`) ?? [],
      warnings: result ? [...new Set(result.warnings)] : []
    })
  } catch (error) {
    failed = true
    report.push({
      adapterKey,
      protocol: adapter.name,
      status: 'error',
      discoveryToken,
      publicAddress: null,
      positionCount: 0,
      products: [],
      warnings: [error instanceof Error ? error.message : String(error)]
    })
  }
}

console.log(JSON.stringify({
  checkedAt: new Date().toISOString(),
  discoverySource: 'Blockscout public Ethereum token-holder API',
  truthSource: 'Each DeFi OS adapter independently re-reads its protocol contracts and official metadata sources',
  adapters: report
}, null, 2))

if (failed) process.exitCode = 2
