import assert from 'node:assert/strict'
import test from 'node:test'
import { fetchAaveEthereumUsdcMarket } from '../server/providers/aave/markets.ts'
import { fetchDefiLlamaYieldPools } from '../server/providers/defillama/yields.ts'
import { ProviderError } from '../server/providers/errors.ts'
import { fetchMorphoEthereumUsdcVaults } from '../server/providers/morpho/vaults.ts'

test('market providers bound upstream requests with an abort signal', async () => {
  const originalFetch = globalThis.fetch
  const providers = [
    { name: 'Aave', fetch: fetchAaveEthereumUsdcMarket },
    { name: 'DefiLlama', fetch: fetchDefiLlamaYieldPools },
    { name: 'Morpho', fetch: fetchMorphoEthereumUsdcVaults }
  ]

  try {
    for (const provider of providers) {
      let capturedSignal: AbortSignal | null | undefined
      globalThis.fetch = (async (_input, init) => {
        capturedSignal = init?.signal
        throw new Error('simulated upstream failure')
      }) as typeof fetch

      await assert.rejects(
        provider.fetch(),
        error => error instanceof ProviderError && error.provider === provider.name
      )
      assert.ok(capturedSignal instanceof AbortSignal, `${provider.name} request must be abortable`)
      assert.equal(capturedSignal.aborted, false)
    }
  } finally {
    globalThis.fetch = originalFetch
  }
})
