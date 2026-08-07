import type { MorphoVaultRecord } from '../../providers/morpho/vaults'
import { ETHEREUM_USDC_ADDRESS } from '../../providers/morpho/vaults'
import type { YieldOpportunity } from '../../types/yield'

const SOURCE_NAME = 'Morpho'
const SOURCE_URL = 'https://api.morpho.org/graphql'
const ASSET = 'USDC'
const ETHEREUM_CHAIN = 'Ethereum'

function isEthereumUsdcUnderlying (assetAddress: string): boolean {
  return assetAddress.toLowerCase() === ETHEREUM_USDC_ADDRESS.toLowerCase()
}

function isUsableNonNegativeFinite (value: number): boolean {
  return Number.isFinite(value) && value >= 0
}

/**
 * Normalize Morpho official vault records into Market opportunities.
 *
 * Rate mapping (intentional):
 *   Morpho GraphQL `netApy` is a decimal APY fraction (e.g. 0.033 = 3.3%).
 *   It is the depositor-facing net APY and may include rewards when present.
 *   Normalized `rate = netApy * 100` with `rateType = 'APY'` is UNIT NORMALIZATION
 *   only — not APR→APY conversion.
 *   Do not silently fall back to apy / nativeApy / netApyExcludingRewards / avgNetApy.
 *
 * TVL mapping:
 *   V1 → state.totalAssetsUsd (already flattened on MorphoVaultRecord.totalAssetsUsd)
 *   V2 → totalAssetsUsd
 *
 * dataQuality = VERIFIED means DeFi OS successfully verified this official-provider
 * observation shape and filters — not protocol safety or recommendation.
 */
export function selectMorphoUsdcOpportunities (
  vaults: MorphoVaultRecord[],
  fetchedAt: string
): YieldOpportunity[] {
  const opportunities: YieldOpportunity[] = []

  for (const vault of vaults) {
    if (vault.listed !== true) {
      continue
    }

    if (!isEthereumUsdcUnderlying(vault.assetAddress)) {
      continue
    }

    if (vault.name.trim() === '' || vault.address.trim() === '') {
      continue
    }

    if (!Number.isFinite(vault.netApy)) {
      console.warn('[morphoUsdcSelector] omitting vault: unusable netApy', {
        address: vault.address,
        version: vault.version
      })
      continue
    }

    if (!isUsableNonNegativeFinite(vault.totalAssetsUsd)) {
      console.warn('[morphoUsdcSelector] omitting vault: unusable totalAssetsUsd', {
        address: vault.address,
        version: vault.version,
        totalAssetsUsd: vault.totalAssetsUsd
      })
      continue
    }

    opportunities.push({
      protocol: 'Morpho',
      product: `${vault.name} (${vault.version})`,
      opportunityType: 'CURATED_VAULT',
      asset: ASSET,
      chain: ETHEREUM_CHAIN,
      // Unit normalize Morpho decimal netApy → percent APY display units.
      rate: vault.netApy * 100,
      rateType: 'APY',
      tvlUsd: vault.totalAssetsUsd,
      source: SOURCE_NAME,
      sourceUrl: SOURCE_URL,
      sourcePoolId: vault.address,
      dataQuality: 'VERIFIED',
      fetchedAt
    })
  }

  return opportunities
}
