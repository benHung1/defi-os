import { Interface } from 'ethers'
import { ethCallData, formatTokenUnits } from '../ethereum/client'
import type { PortfolioPosition } from '../../../shared/types/portfolio'
import type { ProtocolPositionAdapter } from './types'

const MORPHO_GRAPHQL_URL = 'https://api.morpho.org/graphql'
const morphoInterface = new Interface([
  'function position(bytes32 id,address user) view returns (uint256 supplyShares,uint128 borrowShares,uint128 collateral)'
])
const vaultInterface = new Interface([
  'function balanceOf(address account) view returns (uint256)',
  'function convertToAssets(uint256 shares) view returns (uint256)'
])

const QUERY = `
query EthereumUserPositions($address: String!) {
  userByAddress(address: $address, chainId: 1) {
    marketPositions {
      market {
        marketId
        morphoBlue { address }
        loanAsset { address symbol decimals }
        collateralAsset { address symbol decimals }
        state { supplyApy borrowApy }
      }
      state {
        supplyShares supplyAssets supplyAssetsUsd
        borrowShares borrowAssets borrowAssetsUsd
        collateral collateralUsd
      }
    }
    vaultPositions {
      vault {
        address name
        asset { address symbol decimals }
        state { netApy }
      }
      state { shares assets assetsUsd }
    }
  }
}
`

function isRecord (value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function numberValue (value: unknown): number | null {
  const parsed = typeof value === 'string' || typeof value === 'number' ? Number(value) : Number.NaN
  return Number.isFinite(parsed) ? parsed : null
}

async function fetchUserPositions (address: string): Promise<Record<string, unknown>> {
  const response = await fetch(MORPHO_GRAPHQL_URL, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: QUERY, variables: { address } }),
    signal: AbortSignal.timeout(12_000)
  })
  if (!response.ok) throw new Error(`Morpho GraphQL returned HTTP ${response.status}`)
  const payload: unknown = await response.json()
  if (!isRecord(payload) || (Array.isArray(payload.errors) && payload.errors.length > 0) || !isRecord(payload.data) || !isRecord(payload.data.userByAddress)) {
    throw new Error('Morpho GraphQL returned an invalid user position response')
  }
  return payload.data.userByAddress
}

async function verifyMarketPosition (morpho: string, marketId: string, address: string) {
  const data = morphoInterface.encodeFunctionData('position', [marketId, address])
  const result = await ethCallData(morpho, data)
  const decoded = morphoInterface.decodeFunctionResult('position', result)
  return { supplyShares: decoded[0] as bigint, borrowShares: decoded[1] as bigint, collateral: decoded[2] as bigint }
}

async function readVaultAssets (vault: string, address: string): Promise<{ shares: bigint, assets: bigint }> {
  const balanceData = vaultInterface.encodeFunctionData('balanceOf', [address])
  const balanceResult = await ethCallData(vault, balanceData)
  const shares = vaultInterface.decodeFunctionResult('balanceOf', balanceResult)[0] as bigint
  if (shares === BigInt(0)) return { shares, assets: BigInt(0) }
  const assetsData = vaultInterface.encodeFunctionData('convertToAssets', [shares])
  const assetsResult = await ethCallData(vault, assetsData)
  return { shares, assets: vaultInterface.decodeFunctionResult('convertToAssets', assetsResult)[0] as bigint }
}

export const morphoPositionAdapter: ProtocolPositionAdapter = {
  name: 'Morpho Blue',
  async getPositions (address) {
    const user = await fetchUserPositions(address)
    const marketPositions = Array.isArray(user.marketPositions) ? user.marketPositions : []
    const vaultPositions = Array.isArray(user.vaultPositions) ? user.vaultPositions : []
    const warnings: string[] = []
    const positions: PortfolioPosition[] = []
    const verifiedAt = new Date().toISOString()

    const marketResults = await Promise.allSettled(marketPositions.map(async (item) => {
      if (!isRecord(item) || !isRecord(item.market) || !isRecord(item.state)) throw new Error('invalid market position')
      const market = item.market
      const state = item.state
      if (typeof market.marketId !== 'string' || !isRecord(market.morphoBlue) || typeof market.morphoBlue.address !== 'string' || !isRecord(market.loanAsset)) {
        throw new Error('invalid market identity')
      }
      const loan = market.loanAsset
      const collateral = isRecord(market.collateralAsset) ? market.collateralAsset : null
      if (typeof loan.symbol !== 'string' || typeof loan.decimals !== 'number') throw new Error('invalid loan asset')
      const onchain = await verifyMarketPosition(market.morphoBlue.address, market.marketId, address)
      const apiSupplyShares = BigInt(String(state.supplyShares ?? '0'))
      const apiBorrowShares = BigInt(String(state.borrowShares ?? '0'))
      const apiCollateral = BigInt(String(state.collateral ?? '0'))
      if (onchain.supplyShares !== apiSupplyShares || onchain.borrowShares !== apiBorrowShares || onchain.collateral !== apiCollateral) {
        throw new Error('indexer position does not match onchain shares')
      }

      const result: PortfolioPosition[] = []
      const marketState = isRecord(market.state) ? market.state : {}
      const supplyAssets = BigInt(String(state.supplyAssets ?? '0'))
      const borrowAssets = BigInt(String(state.borrowAssets ?? '0'))
      if (onchain.supplyShares > BigInt(0) && supplyAssets > BigInt(0)) {
        result.push({
          protocol: 'Morpho Blue', product: `${loan.symbol} Market`, kind: 'SUPPLY', chain: 'Ethereum', asset: loan.symbol,
          amount: formatTokenUnits(supplyAssets, loan.decimals), valueUsd: numberValue(state.supplyAssetsUsd),
          rate: numberValue(marketState.supplyApy) === null ? null : numberValue(marketState.supplyApy)! * 100,
          rateType: 'APY', contractAddress: market.morphoBlue.address,
          assetAddress: typeof loan.address === 'string' ? loan.address : undefined,
          verification: 'INDEXER_ONCHAIN_VERIFIED', verifiedAt
        })
      }
      if (onchain.borrowShares > BigInt(0) && borrowAssets > BigInt(0)) {
        result.push({
          protocol: 'Morpho Blue', product: `${loan.symbol} Market`, kind: 'BORROW', chain: 'Ethereum', asset: loan.symbol,
          amount: formatTokenUnits(borrowAssets, loan.decimals), valueUsd: numberValue(state.borrowAssetsUsd),
          rate: numberValue(marketState.borrowApy) === null ? null : numberValue(marketState.borrowApy)! * 100,
          rateType: 'APY', contractAddress: market.morphoBlue.address,
          assetAddress: typeof loan.address === 'string' ? loan.address : undefined,
          verification: 'INDEXER_ONCHAIN_VERIFIED', verifiedAt
        })
      }
      if (onchain.collateral > BigInt(0) && collateral && typeof collateral.symbol === 'string' && typeof collateral.decimals === 'number') {
        result.push({
          protocol: 'Morpho Blue', product: `${loan.symbol} Market`, kind: 'COLLATERAL', chain: 'Ethereum', asset: collateral.symbol,
          amount: formatTokenUnits(onchain.collateral, collateral.decimals), valueUsd: numberValue(state.collateralUsd),
          rate: null, rateType: null, contractAddress: market.morphoBlue.address, isCollateral: true,
          assetAddress: typeof collateral.address === 'string' ? collateral.address : undefined,
          verification: 'INDEXER_ONCHAIN_VERIFIED', verifiedAt
        })
      }
      return result
    }))
    marketResults.forEach((result) => {
      if (result.status === 'fulfilled') positions.push(...result.value)
      else warnings.push('Morpho Blue market position unavailable or not verified')
    })

    const vaultResults = await Promise.allSettled(vaultPositions.map(async (item): Promise<PortfolioPosition[]> => {
      if (!isRecord(item) || !isRecord(item.vault) || !isRecord(item.state) || !isRecord(item.vault.asset)) throw new Error('invalid vault position')
      const vault = item.vault
      const assetValue = vault.asset
      if (!isRecord(assetValue)) throw new Error('invalid vault asset')
      const asset = assetValue
      if (typeof vault.address !== 'string' || typeof vault.name !== 'string' || typeof asset.symbol !== 'string' || typeof asset.decimals !== 'number') throw new Error('invalid vault identity')
      const onchain = await readVaultAssets(vault.address, address)
      if (onchain.shares === BigInt(0)) return []
      const vaultState = isRecord(vault.state) ? vault.state : {}
      return [{
        protocol: 'Morpho Blue', product: vault.name, kind: 'VAULT', chain: 'Ethereum', asset: asset.symbol,
        amount: formatTokenUnits(onchain.assets, asset.decimals), valueUsd: numberValue(item.state.assetsUsd),
        rate: numberValue(vaultState.netApy) === null ? null : numberValue(vaultState.netApy)! * 100,
        rateType: 'APY', contractAddress: vault.address,
        assetAddress: typeof asset.address === 'string' ? asset.address : undefined,
        verification: 'INDEXER_ONCHAIN_VERIFIED', verifiedAt
      }]
    }))
    vaultResults.forEach((result) => {
      if (result.status === 'fulfilled') positions.push(...result.value)
      else warnings.push('Morpho Blue vault position unavailable or not verified')
    })

    return { positions, warnings }
  }
}
