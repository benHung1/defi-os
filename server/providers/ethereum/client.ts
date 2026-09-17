const ETHEREUM_RPC_URL = 'https://ethereum-rpc.publicnode.com'

interface JsonRpcResponse {
  result?: unknown
  error?: { message?: unknown }
}

export async function ethCall (to: string, data: string): Promise<bigint> {
  const response = await fetch(ETHEREUM_RPC_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to, data }, 'latest'] }),
    signal: AbortSignal.timeout(12_000)
  })
  if (!response.ok) {
    throw new Error(`Ethereum RPC returned HTTP ${response.status}`)
  }
  const payload = await response.json() as JsonRpcResponse
  if (payload.error || typeof payload.result !== 'string' || !/^0x[0-9a-f]+$/i.test(payload.result)) {
    const detail = typeof payload.error?.message === 'string' ? payload.error.message : 'invalid result'
    throw new Error(`Ethereum RPC eth_call failed: ${detail}`)
  }
  return BigInt(payload.result)
}

export function encodeUint256Argument (value: bigint): string {
  return value.toString(16).padStart(64, '0')
}

export function formatTokenUnits (value: bigint, decimals: number): number {
  return Number(value) / Math.pow(10, decimals)
}
