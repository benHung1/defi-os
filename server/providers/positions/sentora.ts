import { Interface } from 'ethers'
import type { PortfolioPosition } from '../../../shared/types/portfolio.ts'
import { ethCallData, formatTokenUnits } from '../ethereum/client.ts'
import type { ProtocolPositionAdapter } from './types.ts'

const SENTORA_VAULT = '0x74aD2F789Ed583DBd141bbdafC673fE1F033718b'
const SENTORA_RECEIPT_TOKEN = '0xe8aa1a9ec6b9bc455d8f33e4bdc685dedff82407'
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9eb0ce3606eb48'
const SENTORA_API_URL = `https://api.upshift.finance/v1/tokenized_vaults/${SENTORA_VAULT}`
const receiptInterface = new Interface(['function balanceOf(address account) view returns (uint256)'])

interface SentoraVaultResponse {
  historical_apy?: Record<string, unknown>
  historical_snapshots?: Array<{
    asset_share_ratio?: unknown
    snapshot_datetime?: unknown
  }>
}

async function readReceiptBalance (address: string): Promise<bigint> {
  const data = receiptInterface.encodeFunctionData('balanceOf', [address])
  const result = await ethCallData(SENTORA_RECEIPT_TOKEN, data)
  return receiptInterface.decodeFunctionResult('balanceOf', result)[0] as bigint
}

async function fetchLatestVaultMetrics (): Promise<{ shareRatio: number, apy: number | null }> {
  const response = await fetch(SENTORA_API_URL, { signal: AbortSignal.timeout(12_000) })
  if (!response.ok) throw new Error(`Upshift API returned HTTP ${response.status}`)
  const payload = await response.json() as SentoraVaultResponse
  const snapshots = Array.isArray(payload.historical_snapshots) ? payload.historical_snapshots : []
  const latest = [...snapshots]
    .filter(snapshot => Number.isFinite(Number(snapshot.asset_share_ratio)))
    .sort((left, right) => String(right.snapshot_datetime).localeCompare(String(left.snapshot_datetime)))[0]
  const shareRatio = Number(latest?.asset_share_ratio)
  if (!Number.isFinite(shareRatio) || shareRatio <= 0) throw new Error('Upshift API returned no valid share ratio')
  const rawApy = Number(payload.historical_apy?.['30'])
  return { shareRatio, apy: Number.isFinite(rawApy) ? rawApy * 100 : null }
}

export const sentoraPositionAdapter: ProtocolPositionAdapter = {
  name: 'Sentora',
  async getPositions (address) {
    const shares = await readReceiptBalance(address)
    if (shares === BigInt(0)) return { positions: [], warnings: [] }

    const metrics = await fetchLatestVaultMetrics()
    const amount = formatTokenUnits(shares, 6) * metrics.shareRatio
    const position: PortfolioPosition = {
      protocol: 'Sentora',
      product: 'Sentora USD',
      kind: 'VAULT',
      chain: 'Ethereum',
      asset: 'USDC',
      amount,
      valueUsd: amount,
      rate: metrics.apy,
      rateType: metrics.apy === null ? null : 'APY',
      contractAddress: SENTORA_RECEIPT_TOKEN,
      assetAddress: USDC_ADDRESS,
      verification: 'INDEXER_ONCHAIN_VERIFIED',
      verifiedAt: new Date().toISOString()
    }
    return { positions: [position], warnings: [] }
  }
}
