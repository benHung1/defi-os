import { Interface } from 'ethers'
import type { PortfolioPosition } from '../../../shared/types/portfolio.ts'
import { ethCallData, formatTokenUnits } from '../ethereum/client.ts'
import type { ProtocolPositionAdapter } from './types.ts'

const tokenInterface = new Interface([
  'function balanceOf(address account) view returns (uint256)'
])
const feedInterface = new Interface([
  'function getDataInBase18() view returns (uint256)'
])

interface MidasTokenConfig {
  symbol: string
  token: string
  feeds: string[]
}

const MIDAS_TOKENS: MidasTokenConfig[] = [
  { symbol: 'mTBILL', token: '0xDD629E5241CbC5919847783e6C96B2De4754e438', feeds: ['0xfCEE9754E8C375e145303b7cE7BEca3201734A2B'] },
  { symbol: 'mFONE', token: '0x238a700eD6165261Cf8b2e544ba797BC11e466Ba', feeds: ['0xCF4e49f5e750Af8F2f9Aa1642B68E5839D9c1C00'] },
  { symbol: 'mHYPER', token: '0x9b5528528656DBC094765E2abB79F293c21191B9', feeds: ['0x92004DCC5359eD67f287F32d12715A37916deCdE'] },
  {
    symbol: 'mGLOBAL',
    token: '0x7433806912Eae67919e66aea853d46Fa0aef98A8',
    // Official deposit/redemption feeds are the NAV adjusted by +7% / -7%.
    // Their midpoint recovers the unadjusted NAV without trusting a third party.
    feeds: ['0x58476f452df10E6Bf17dc1fee418E98dE9e14868', '0xb468A6F63868cB6C6D99105EDfbe73d6B21f139E']
  }
]

async function readUint (target: string, iface: Interface, functionName: string, args: unknown[] = []): Promise<bigint> {
  const result = await ethCallData(target, iface.encodeFunctionData(functionName, args))
  return iface.decodeFunctionResult(functionName, result)[0] as bigint
}

async function readMidasPosition (address: string, config: MidasTokenConfig): Promise<PortfolioPosition | null> {
  const balance = await readUint(config.token, tokenInterface, 'balanceOf', [address])
  if (balance === BigInt(0)) return null

  const prices = await Promise.all(config.feeds.map(feed => readUint(feed, feedInterface, 'getDataInBase18')))
  const price = prices.reduce((sum, value) => sum + value, BigInt(0)) / BigInt(prices.length)
  const amount = formatTokenUnits(balance, 18)

  return {
    protocol: 'Midas',
    product: config.symbol,
    kind: 'VAULT',
    chain: 'Ethereum',
    asset: config.symbol,
    amount,
    valueUsd: amount * formatTokenUnits(price, 18),
    rate: null,
    rateType: null,
    contractAddress: config.token,
    verification: 'ONCHAIN',
    verifiedAt: new Date().toISOString()
  }
}

export const midasPositionAdapter: ProtocolPositionAdapter = {
  name: 'Midas',
  async getPositions (address) {
    const settled = await Promise.allSettled(MIDAS_TOKENS.map(config => readMidasPosition(address, config)))
    const positions = settled.flatMap(result => result.status === 'fulfilled' && result.value ? [result.value] : [])
    const failedCount = settled.filter(result => result.status === 'rejected').length
    return {
      positions,
      warnings: failedCount > 0 ? [`Midas positions unavailable for ${failedCount} products`] : []
    }
  }
}
