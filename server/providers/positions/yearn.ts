import { Interface } from 'ethers'
import type { PortfolioPosition } from '../../../shared/types/portfolio.ts'
import { ethCallData, formatTokenUnits } from '../ethereum/client.ts'
import { readErc4626Position } from './erc4626.ts'
import type { ProtocolPositionAdapter } from './types.ts'

const YEARN_VAULTS_URL = 'https://ydaemon.yearn.fi/vaults/all?chainids=1&limit=100000'
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
const legacyVaultInterface = new Interface([
  'function balanceOf(address account) view returns (uint256)',
  'function pricePerShare() view returns (uint256)'
])

interface YearnVault {
  address?: unknown
  name?: unknown
  version?: unknown
  decimals?: unknown
  endorsed?: unknown
  emergency_shutdown?: unknown
  token?: { address?: unknown, decimals?: unknown }
  tvl?: { tvl?: unknown }
  apr?: { netAPR?: unknown }
  details?: { isRetired?: unknown, isHidden?: unknown }
}

function isKnownUsdcVault (vault: YearnVault): boolean {
  return typeof vault.address === 'string'
    && vault.token?.address?.toString().toLowerCase() === USDC_ADDRESS.toLowerCase()
}

function optionalFiniteNumber (value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

async function fetchKnownUsdcVaults (): Promise<YearnVault[]> {
  const response = await fetch(YEARN_VAULTS_URL, { signal: AbortSignal.timeout(12_000) })
  if (!response.ok) throw new Error(`Yearn API returned HTTP ${response.status}`)
  const payload = await response.json()
  if (!Array.isArray(payload)) throw new Error('Yearn API returned an invalid vault list')
  // Portfolio discovery must include retired, hidden, unendorsed, or
  // emergency-shutdown vaults: a user can still hold withdrawable shares
  // after market admission has ended. Market discovery applies its own
  // active-product filters. `endorsed` is deprecated and absent from the
  // current complete Yearn vault response.
  return (payload as YearnVault[]).filter(isKnownUsdcVault)
}

async function readLegacyPosition (address: string, vault: YearnVault): Promise<PortfolioPosition | null> {
  const vaultAddress = vault.address as string
  const balanceData = legacyVaultInterface.encodeFunctionData('balanceOf', [address])
  const balanceResult = await ethCallData(vaultAddress, balanceData)
  const shares = legacyVaultInterface.decodeFunctionResult('balanceOf', balanceResult)[0] as bigint
  if (shares === BigInt(0)) return null

  const priceData = legacyVaultInterface.encodeFunctionData('pricePerShare', [])
  const priceResult = await ethCallData(vaultAddress, priceData)
  const pricePerShare = legacyVaultInterface.decodeFunctionResult('pricePerShare', priceResult)[0] as bigint
  const decimals = Number(vault.decimals ?? 6)
  const assets = shares * pricePerShare / (BigInt(10) ** BigInt(decimals))
  const netApr = optionalFiniteNumber(vault.apr?.netAPR)

  return {
    protocol: 'Yearn',
    product: typeof vault.name === 'string' ? vault.name : 'Yearn USDC Vault',
    kind: 'VAULT',
    chain: 'Ethereum',
    asset: 'USDC',
    amount: formatTokenUnits(assets, Number(vault.token?.decimals ?? 6)),
    valueUsd: null,
    rate: netApr === null ? null : netApr * 100,
    rateType: netApr === null ? null : 'APR',
    contractAddress: vaultAddress,
    assetAddress: USDC_ADDRESS,
    verification: 'ONCHAIN',
    verifiedAt: new Date().toISOString()
  }
}

async function readYearnVaultPosition (address: string, vault: YearnVault): Promise<PortfolioPosition | null> {
  const version = typeof vault.version === 'string' ? vault.version : ''
  const netApr = optionalFiniteNumber(vault.apr?.netAPR)
  if (!version.startsWith('3.')) return readLegacyPosition(address, vault)

  return readErc4626Position(address, {
    protocol: 'Yearn',
    product: typeof vault.name === 'string' ? vault.name : 'Yearn USDC Vault',
    vaultAddress: vault.address as string,
    asset: 'USDC',
    assetAddress: USDC_ADDRESS,
    assetDecimals: Number(vault.token?.decimals ?? 6),
    rate: netApr === null ? null : netApr * 100,
    rateType: netApr === null ? null : 'APR'
  })
}

export const yearnPositionAdapter: ProtocolPositionAdapter = {
  name: 'Yearn',
  async getPositions (address) {
    const vaults = await fetchKnownUsdcVaults()
    const settled = await Promise.allSettled(vaults.map(vault => readYearnVaultPosition(address, vault)))
    const positions = settled.flatMap(result => result.status === 'fulfilled' && result.value ? [result.value] : [])
    const failedCount = settled.filter(result => result.status === 'rejected').length
    return {
      positions,
      warnings: failedCount > 0 ? [`Yearn positions unavailable for ${failedCount} known vaults`] : []
    }
  }
}
