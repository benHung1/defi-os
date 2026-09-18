const ETHEREUM_RPC_URL = 'https://ethereum-rpc.publicnode.com'

interface JsonRpcResponse {
  result?: unknown
  error?: { message?: unknown }
}

async function ethereumRpc (method: string, params: unknown[]): Promise<unknown> {
  const response = await fetch(ETHEREUM_RPC_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(12_000)
  })
  if (!response.ok) throw new Error(`Ethereum RPC returned HTTP ${response.status}`)

  const payload = await response.json() as JsonRpcResponse
  if (payload.error || payload.result === undefined) {
    const detail = typeof payload.error?.message === 'string' ? payload.error.message : 'invalid result'
    throw new Error(`Ethereum RPC ${method} failed: ${detail}`)
  }
  return payload.result
}

export async function ethCallData (to: string, data: string): Promise<string> {
  const result = await ethereumRpc('eth_call', [{ to, data }, 'latest'])
  if (typeof result !== 'string' || !/^0x[0-9a-f]*$/i.test(result)) throw new Error('Ethereum RPC eth_call returned an invalid result')
  return result
}

export async function ethCall (to: string, data: string): Promise<bigint> {
  return BigInt(await ethCallData(to, data))
}

export async function ethGetBalance (address: string): Promise<bigint> {
  const result = await ethereumRpc('eth_getBalance', [address, 'latest'])
  if (typeof result !== 'string' || !/^0x[0-9a-f]+$/i.test(result)) throw new Error('Ethereum RPC eth_getBalance returned an invalid result')
  return BigInt(result)
}

export function encodeUint256Argument (value: bigint): string {
  return value.toString(16).padStart(64, '0')
}

export function encodeAddressArgument (address: string): string {
  return address.toLowerCase().replace(/^0x/, '').padStart(64, '0')
}

export function formatTokenUnits (value: bigint, decimals: number): number {
  return Number(value) / Math.pow(10, decimals)
}
