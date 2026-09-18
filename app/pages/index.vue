<script setup lang="ts">
type DecisionLevel = 'healthy' | 'attention'

interface SummaryItem {
  label: string
  value: string
  note: string
}

interface ChainEvent {
  type: string
  title: string
  protocol: string
  attention: string
  time: string
}

interface Dashboard {
  greeting: string
  date: string
  portfolio: SummaryItem[]
  events: ChainEvent[]
  updatedAt: string
}

type OpportunityType = 'LENDING_SUPPLY' | 'SAVINGS' | 'CURATED_VAULT'
type RateType = 'APR' | 'APY'
type DataSourceKind = 'OFFICIAL_API' | 'ONCHAIN' | 'THIRD_PARTY_AGGREGATOR'
type MarketSort = 'tvl' | 'rate' | 'protocol'
type MarketChain = string
type MarketAsset = 'USDC' | 'USDT' | 'ETH' | 'BTC'
interface MarketChainOption { key: MarketChain, label: string, symbol: string, group: 'L1' | 'L2' | 'OTHER', assets: MarketAsset[] }
interface MarketOptionsResponse { chains: MarketChainOption[], assets: MarketAsset[] }
type FreshnessStatus = 'fresh' | 'stale' | 'unavailable'
type ProviderFetchStatus = 'ok' | 'error'

interface ProviderFetchMeta {
  name: string
  status: ProviderFetchStatus
  fetchedAt?: string
}

interface YieldOpportunity {
  protocol: string
  product: string
  productVersion?: string
  opportunityType: OpportunityType
  asset: string
  chain: string
  rate: number
  rateType: RateType
  tvlUsd: number | null
  source: string
  sourceKind: DataSourceKind
  productUrl?: string
  sourceUrl?: string
  sourcePoolId?: string
  dataQuality: string
  fetchedAt: string
}

interface YieldResponseMeta {
  fetchedAt: string
  status: FreshnessStatus
  providers: ProviderFetchMeta[]
  servedFromCache?: boolean
  refreshCooldownSeconds?: number
  cacheFallback?: boolean
}

interface ExcludedMarketObservation {
  protocol: string
  product: string
  chain: string
  asset: string
  reasonCode: 'APY_DEVIATES_FROM_30D_MEAN'
  reason: string
  currentRate: number
  referenceRate: number
  rateType: RateType
  source: string
  sourceKind: DataSourceKind
  productUrl?: string
  sourcePoolId?: string
}

interface UsdcMarketDashboardResponse {
  data: YieldOpportunity[]
  excluded: ExcludedMarketObservation[]
  meta: YieldResponseMeta & {
    ranking: {
      scope: 'SUPPORTED_ETHEREUM_USDC_PROTOCOLS' | 'SUPPORTED_MARKET_PROTOCOLS'
      sort: MarketSort
      limit: number
      productCount: number
      totalEligibleProducts: number
    }
  }
}

interface UsdcCurrentPosition {
  asset: 'USDC'
  protocol: string
  product: string
  opportunityType: OpportunityType
  chain: string
  amount: number
}

interface UsdcCurrentPositionRate {
  rate: number
  rateType: RateType
}

interface UsdcDecisionCandidateResponse {
  currentPosition: UsdcCurrentPosition
  currentPositionRate: UsdcCurrentPositionRate | null
  candidates: YieldOpportunity[]
  meta: YieldResponseMeta
}

/**
 * Temporary current-position fixture until Portfolio Sprint.
 * Identity aligns with server/api/decision/usdc.get.ts temporaryCurrentPosition.
 * Not wallet-derived. Not mixed into Decision candidate market data.
 */
const CURRENT_POSITION_FIXTURE: UsdcCurrentPosition = {
  asset: 'USDC',
  protocol: 'Spark',
  product: 'Spark Savings USDC',
  opportunityType: 'SAVINGS',
  chain: 'Ethereum',
  amount: 40000
}

/** Presentation ceiling for personal higher-yield comparison rows (not a recommendation rank). */
const PERSONAL_HIGHER_YIELD_DISPLAY_LIMIT = 5
const MARKET_ALL_PRODUCT_LIMIT = 100
const MARKET_INITIAL_PROTOCOL_LIMIT = 5

const dashboard: Dashboard = {
  greeting: '早安',
  date: '2026 年 8 月 5 日',
  portfolio: [
    { label: '投資組合價值', value: 'US$128,450', note: '手動輸入的持倉合計' },
    { label: '資產', value: '4 種', note: 'USDC、ETH、WBTC、stETH' },
    { label: '協議', value: '3 個', note: 'Aave、Lido、Compound' },
    { label: '鏈', value: '2 條', note: 'Ethereum、Arbitrum' }
  ],
  events: [
    {
      type: '協議更新',
      title: 'Aave 完成利率模型調整',
      protocol: 'Aave',
      attention: '可觀察',
      time: '2 小時前'
    },
    {
      type: '治理通過',
      title: 'Lido 通過提領佇列參數更新',
      protocol: 'Lido',
      attention: '可觀察',
      time: '今天 09:20'
    },
    {
      type: '市場動態',
      title: 'Compound USDC 池 TVL 小幅變動',
      protocol: 'Compound',
      attention: '可觀察',
      time: '昨天 21:05'
    }
  ],
  updatedAt: '2026-08-05 16:40'
}

function formatSignedRateDiff (diff: number): string {
  const sign = diff > 0 ? '+' : ''
  return `${sign}${diff.toFixed(2)}%`
}

function formatAnnualDiff (amount: number, rateDiff: number): string | null {
  if (rateDiff === 0) {
    return null
  }
  const yearly = Math.round(amount * (rateDiff / 100))
  const sign = yearly > 0 ? '+' : ''
  return `約 ${sign}${yearly.toLocaleString('en-US')} USDC / 年`
}

function opportunityTypeLabel (opportunityType: OpportunityType): string {
  if (opportunityType === 'LENDING_SUPPLY') {
    return 'Lending'
  }
  if (opportunityType === 'SAVINGS') {
    return 'Savings'
  }
  return 'Vault'
}

function formatMarketRate (rate: number, rateType: RateType): string {
  return `${rate.toFixed(2)}% ${rateType}`
}

function formatCompactUsd (value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return '—'
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value)
}

function formatFetchedAt (fetchedAt: string): string {
  const ms = Date.parse(fetchedAt)
  if (Number.isNaN(ms)) {
    return fetchedAt
  }

  const parts = new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Taipei'
  }).formatToParts(new Date(ms))

  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${values.year}/${values.month}/${values.day} ${values.hour}:${values.minute}`
}

function eventTone (type: string): string {
  if (type.includes('治理')) return 'governance'
  if (type.includes('市場')) return 'market'
  return 'protocol'
}

function opportunitySourceLabel (opportunity: YieldOpportunity): string {
  if (opportunity.sourceKind === 'ONCHAIN') return `${opportunity.protocol} 主網合約`
  if (opportunity.sourceKind === 'THIRD_PARTY_AGGREGATOR') return 'DefiLlama 第三方備援'
  return `${opportunity.protocol} 官方 API`
}

function dataSourceHelp (kinds: Set<DataSourceKind>): string {
  if (kinds.size > 1) return '此協議目前混合多種資料來源。'
  if (kinds.has('OFFICIAL_API')) return '由協議官方提供的 API 資料。'
  if (kinds.has('ONCHAIN')) return '直接讀取 Ethereum 上的產品合約。'
  return '此候選目前採用第三方聚合資料，尚未由協議官方來源覆蓋。'
}

function rateHelp (rateType: RateType): string {
  return rateType === 'APY'
    ? 'APY 已計入複利效果；請只與相同 APY 口徑直接比較。'
    : 'APR 是未計複利的年化利率；請只與相同 APR 口徑直接比較。'
}

function opportunityDisplayTypeLabel (opportunity: YieldOpportunity): string {
  const base = opportunityTypeLabel(opportunity.opportunityType)
  return opportunity.productVersion ? `${base} ${opportunity.productVersion}` : base
}

const { toggleLabel, toggleTheme } = useTheme()
const { isConnected: isWalletConnected } = useWalletSession()
const route = useRoute()
const router = useRouter()

const { data: marketOptions } = await useFetch<MarketOptionsResponse>('/api/market/options')
const chainOptions = computed(() => marketOptions.value?.chains ?? [])
const validChains = computed(() => chainOptions.value.map(chain => chain.key))
const validAssets = computed(() => marketOptions.value?.assets ?? ['USDC', 'USDT', 'ETH', 'BTC'])
const queryValues = (value: unknown): string[] => String(value ?? '').split(',').filter(Boolean)
const chainQuery = String(route.query.chains ?? route.query.chain ?? 'ethereum')
const assetQuery = String(route.query.assets ?? route.query.asset ?? 'usdc')
const initialChains = queryValues(chainQuery).filter(value => validChains.value.includes(value))
const initialAssets = queryValues(assetQuery).map(value => value.toUpperCase()).filter(value => validAssets.value.includes(value as MarketAsset)) as MarketAsset[]
const marketChains = ref<MarketChain[]>(chainQuery === 'all' ? [] : [...new Set(initialChains)])
const marketAssets = ref<MarketAsset[]>(assetQuery.toLowerCase() === 'all' ? [] : [...new Set(initialAssets)])
const marketSearch = ref(String(route.query.q ?? '').slice(0, 80))
const marketSearchDraft = ref(marketSearch.value)
const initialMarketSort = ['tvl', 'rate', 'protocol'].includes(String(route.query.sort))
  ? String(route.query.sort) as MarketSort
  : 'tvl'
const marketSort = ref<MarketSort>(initialMarketSort)
const marketRateType = ref<RateType>(String(route.query.rateType).toUpperCase() === 'APR' ? 'APR' : 'APY')
const chainLabel = (key: MarketChain): string => chainOptions.value.find(chain => chain.key === key)?.label ?? key
const marketScopeLabel = computed(() => {
  if (marketChains.value.length === 0 && marketAssets.value.length === 0) return '全部鏈 · 全部資產'
  if (marketChains.value.length === 0) return `全部鏈 · ${marketAssets.value.length === 1 ? marketAssets.value[0] : `${marketAssets.value.length} 種資產`}`
  if (marketAssets.value.length === 0) return `${marketChains.value.length === 1 ? chainLabel(marketChains.value[0]!) : `${marketChains.value.length} 條鏈`} · 全部資產`
  if (marketChains.value.length === 1 && marketAssets.value.length === 1) {
    return `${chainLabel(marketChains.value[0]!)} · ${marketAssets.value[0]}`
  }
  return `${marketChains.value.length} 條鏈 · ${marketAssets.value.length} 種資產`
})

function marketDashboardUrl (limit: number, refresh = false): string {
  const params = new URLSearchParams({
    limit: String(limit),
    sort: 'tvl',
    chains: marketChains.value.length > 0 ? marketChains.value.join(',') : 'all',
    assets: marketAssets.value.length > 0 ? marketAssets.value.map(asset => asset.toLowerCase()).join(',') : 'all'
  })
  if (marketSearch.value) params.set('q', marketSearch.value)
  if (refresh) params.set('refresh', '1')
  return `/api/market/dashboard?${params.toString()}`
}

let marketScopeRequestId = 0
const marketUpdating = ref(false)
async function applyMarketScope (scope: { chains: MarketChain[], assets: MarketAsset[] }): Promise<void> {
  const requestId = ++marketScopeRequestId
  marketUpdating.value = true
  marketChains.value = scope.chains
  marketAssets.value = scope.assets
  showAllMarketProtocols.value = false
  marketRefreshMessage.value = null
  const { chain: _chain, asset: _asset, ...query } = route.query
  await router.replace({ query: {
    ...query,
    chains: scope.chains.length > 0 ? scope.chains.join(',') : 'all',
    assets: scope.assets.length > 0 ? scope.assets.map(asset => asset.toLowerCase()).join(',') : 'all',
    q: marketSearch.value || undefined,
    sort: marketSort.value === 'tvl' ? undefined : marketSort.value,
    rateType: marketSort.value === 'rate' ? marketRateType.value.toLowerCase() : undefined
  } })
  try {
    const response = await $fetch<UsdcMarketDashboardResponse>(marketDashboardUrl(MARKET_ALL_PRODUCT_LIMIT))
    if (requestId === marketScopeRequestId) marketDashboard.value = response
  } catch {
    if (requestId === marketScopeRequestId) marketRefreshMessage.value = '篩選更新失敗，畫面保留上一份資料。'
  } finally {
    if (requestId === marketScopeRequestId) marketUpdating.value = false
  }
}

async function applyMarketSearch (): Promise<void> {
  marketSearch.value = marketSearchDraft.value.trim().slice(0, 80)
  await applyMarketScope({ chains: marketChains.value, assets: marketAssets.value })
}

async function clearMarketSearch (): Promise<void> {
  marketSearchDraft.value = ''
  marketSearch.value = ''
  await applyMarketScope({ chains: marketChains.value, assets: marketAssets.value })
}

async function applyMarketSort (): Promise<void> {
  showAllMarketProtocols.value = false
  await router.replace({ query: {
    ...route.query,
    sort: marketSort.value === 'tvl' ? undefined : marketSort.value,
    rateType: marketSort.value === 'rate' ? marketRateType.value.toLowerCase() : undefined
  } })
}

const hasActiveMarketFilters = computed(() =>
  marketChains.value.length > 0
  || marketAssets.value.length > 0
  || marketSearch.value.length > 0
  || marketSort.value !== 'tvl')

async function clearAllMarketFilters (): Promise<void> {
  marketSearchDraft.value = ''
  marketSearch.value = ''
  marketSort.value = 'tvl'
  marketRateType.value = 'APY'
  await applyMarketScope({ chains: [], assets: [] })
}

function applyAssetPreset (assets: MarketAsset[]): void {
  void applyMarketScope({ chains: marketChains.value, assets })
}

function isAssetPresetActive (assets: MarketAsset[]): boolean {
  return marketAssets.value.length === assets.length && assets.every(asset => marketAssets.value.includes(asset))
}

const {
  data: marketDashboard,
  pending: marketPending,
  error: marketError
} = await useFetch<UsdcMarketDashboardResponse>(
  marketDashboardUrl(MARKET_ALL_PRODUCT_LIMIT)
)

const showAllMarketProtocols = ref(false)
const marketRefreshing = ref(false)
const marketRefreshMessage = ref<string | null>(null)

async function refreshMarket (): Promise<void> {
  marketRefreshing.value = true
  marketRefreshMessage.value = null

  try {
    const refreshed = await $fetch<UsdcMarketDashboardResponse>(
      marketDashboardUrl(MARKET_ALL_PRODUCT_LIMIT, true)
    )
    marketDashboard.value = refreshed

    const cooldown = refreshed.meta.refreshCooldownSeconds
    if (refreshed.meta.cacheFallback) {
      marketRefreshMessage.value = '上游暫時無法更新，正在顯示最近一次成功資料。'
    } else if (cooldown) {
      marketRefreshMessage.value = `剛剛已更新，${cooldown} 秒後可再次取得上游資料。`
    } else {
      marketRefreshMessage.value = '已取得目前可用的最新資料。'
    }
  } catch {
    marketRefreshMessage.value = '更新失敗，畫面保留最近一次成功資料。'
  } finally {
    marketRefreshing.value = false
  }
}

function toggleMarketProtocols (): void {
  showAllMarketProtocols.value = !showAllMarketProtocols.value
}

const {
  data: decisionPayload,
  pending: decisionPending,
  error: decisionError
} = await useFetch<UsdcDecisionCandidateResponse>('/api/decision/usdc')

const marketGroups = computed(() => {
  const payload = marketDashboard.value
  if (!payload) {
    return []
  }

  const groups = new Map<string, {
    protocol: string
    totalTvlUsd: number
    sourceKinds: Set<DataSourceKind>
    rows: Array<{
      key: string
      rank: number
      product: string
      typeLabel: string
      chain: string
      rateLabel: string
      rate: number
      tvlLabel: string
      sourceLabel: string
      fetchedAtLabel: string
      rateHelp: string
      productUrl?: string
    }>
  }>()

  const matchingData = marketSort.value === 'rate'
    ? payload.data.filter(opportunity => opportunity.rateType === marketRateType.value)
    : payload.data
  const rankedData = [...matchingData].sort((left, right) => {
    if (marketSort.value === 'rate') return right.rate - left.rate
    if (marketSort.value === 'protocol') {
      const protocolCompare = left.protocol.localeCompare(right.protocol)
      return protocolCompare || left.product.localeCompare(right.product)
    }
    return (right.tvlUsd ?? 0) - (left.tvlUsd ?? 0)
  })

  for (const [index, opportunity] of rankedData.entries()) {
    const group = groups.get(opportunity.protocol) ?? {
      protocol: opportunity.protocol,
      totalTvlUsd: 0,
      sourceKinds: new Set<DataSourceKind>(),
      rows: []
    }
    group.totalTvlUsd += opportunity.tvlUsd ?? 0
    group.sourceKinds.add(opportunity.sourceKind)
    group.rows.push({
      key: `${opportunity.protocol}:${opportunity.product}:${opportunity.sourcePoolId ?? ''}`,
      rank: index + 1,
      product: opportunity.product,
      typeLabel: opportunityDisplayTypeLabel(opportunity),
      chain: opportunity.chain,
      rateLabel: formatMarketRate(opportunity.rate, opportunity.rateType),
      rate: opportunity.rate,
      tvlLabel: formatCompactUsd(opportunity.tvlUsd),
      sourceLabel: `資料來源：${opportunitySourceLabel(opportunity)}`,
      fetchedAtLabel: formatFetchedAt(opportunity.fetchedAt),
      rateHelp: rateHelp(opportunity.rateType),
      productUrl: opportunity.productUrl
    })
    groups.set(opportunity.protocol, group)
  }

  return Array.from(groups.values())
    .map(group => ({
      ...group,
      tvlLabel: formatCompactUsd(group.totalTvlUsd),
      sourceHelp: dataSourceHelp(group.sourceKinds),
      sourceLabel: group.sourceKinds.size === 1
        ? group.sourceKinds.has('OFFICIAL_API')
          ? '官方資料'
          : group.sourceKinds.has('ONCHAIN')
            ? '鏈上資料'
            : '第三方資料'
        : '混合資料',
      sourceTone: group.sourceKinds.size > 1
        ? 'mixed' as const
        : group.sourceKinds.has('OFFICIAL_API')
          ? 'official' as const
          : group.sourceKinds.has('ONCHAIN')
            ? 'onchain' as const
            : 'third-party' as const,
      highestRate: Math.max(...group.rows.map(row => row.rate))
    }))
    .sort((left, right) => {
      if (marketSort.value === 'rate') return right.highestRate - left.highestRate
      if (marketSort.value === 'protocol') return left.protocol.localeCompare(right.protocol)
      return right.totalTvlUsd - left.totalTvlUsd
    })
})

const fallbackProtocolNames = computed(() => marketGroups.value
  .filter(group => group.sourceKinds.has('THIRD_PARTY_AGGREGATOR'))
  .map(group => group.protocol))

const visibleMarketGroups = computed(() => showAllMarketProtocols.value
  ? marketGroups.value
  : marketGroups.value.slice(0, MARKET_INITIAL_PROTOCOL_LIMIT))

const hasMoreMarketProtocols = computed(() => marketGroups.value.length > MARKET_INITIAL_PROTOCOL_LIMIT)

const marketRankingLabel = computed(() => {
  const ranking = marketDashboard.value?.meta.ranking
  if (!ranking) {
    return `DeFi OS 已支援的 ${marketScopeLabel.value} 市場，依 TVL 合計排序`
  }

  const count = marketGroups.value.reduce((total, group) => total + group.rows.length, 0)
  if (marketSort.value === 'rate') return `DeFi OS 已支援的 ${marketScopeLabel.value} 市場 · ${marketRateType.value} 由高至低（${count} 個產品）`
  if (marketSort.value === 'protocol') return `DeFi OS 已支援的 ${marketScopeLabel.value} 市場 · 協議名稱排序（${count} 個產品）`
  return `DeFi OS 已支援的 ${marketScopeLabel.value} 市場 · TVL 由高至低（${count} 個產品）`
})

const marketSearchResultLabel = computed(() => marketSearch.value
  ? `找到 ${marketDashboard.value?.meta.ranking.totalEligibleProducts ?? 0} 個符合「${marketSearch.value}」的產品`
  : null)

const hasPartialProviderFailure = computed(() => {
  const providers = marketDashboard.value?.meta.providers
  if (!providers || providers.length === 0) {
    return false
  }
  return providers.some(provider => provider.status === 'error')
})

const marketFetchedAtLabel = computed(() => {
  const fetchedAt = marketDashboard.value?.meta.fetchedAt
  if (!fetchedAt) {
    return null
  }
  return formatFetchedAt(fetchedAt)
})

const displayPosition = computed(() => {
  return decisionPayload.value?.currentPosition ?? CURRENT_POSITION_FIXTURE
})

const currentPositionRate = computed(() => {
  return decisionPayload.value?.currentPositionRate ?? null
})

const decisionCandidates = computed(() => {
  return decisionPayload.value?.candidates ?? []
})

/**
 * Personal rate comparison is allowed only when rateType matches.
 * Do not convert APR↔APY; exclude mismatched types from numeric comparison.
 */
function isRateTypeComparable (
  candidate: YieldOpportunity,
  positionRate: UsdcCurrentPositionRate
): boolean {
  return candidate.rateType === positionRate.rateType
    && Number.isFinite(candidate.rate)
}

const rateComparableCandidates = computed(() => {
  const positionRate = currentPositionRate.value
  if (!positionRate) {
    return []
  }

  return decisionCandidates.value.filter(candidate =>
    isRateTypeComparable(candidate, positionRate)
  )
})

const higherYieldCandidates = computed(() => {
  const positionRate = currentPositionRate.value
  if (!positionRate) {
    return []
  }

  return rateComparableCandidates.value
    .filter(candidate => candidate.rate > positionRate.rate)
    .slice()
    .sort((left, right) => {
      const rateDiff = right.rate - left.rate
      if (rateDiff !== 0) {
        return rateDiff
      }
      return (right.tvlUsd ?? -1) - (left.tvlUsd ?? -1)
    })
})

const personalComparisonRows = computed(() => {
  const position = displayPosition.value
  const positionRate = currentPositionRate.value
  if (!positionRate) {
    return []
  }

  return higherYieldCandidates.value
    .slice(0, PERSONAL_HIGHER_YIELD_DISPLAY_LIMIT)
    .map((candidate) => {
      const rateDiff = Number((candidate.rate - positionRate.rate).toFixed(2))
      return {
        key: `${candidate.protocol}:${candidate.product}:${candidate.sourcePoolId ?? ''}`,
        protocol: candidate.protocol,
        product: candidate.product,
        aprLabel: formatMarketRate(candidate.rate, candidate.rateType),
        tvlLabel: formatCompactUsd(candidate.tvlUsd),
        metaLabel: `${opportunityDisplayTypeLabel(candidate)} · ${candidate.chain}`,
        isCurrent: false,
        aprDiffLabel: `${formatSignedRateDiff(rateDiff)} vs 目前`,
        annualDiffLabel: formatAnnualDiff(position.amount, rateDiff)
      }
    })
})

const hero = computed(() => {
  if (!isWalletConnected.value) {
    return {
      level: 'healthy' as const,
      question: '開始前，先連接你的錢包',
      headline: '連接錢包後，查看真正與你相關的 DeFi 提醒',
      statement: 'DeFi OS 會依你的公開地址整理資產與部位，再從市場資料中找出值得你留意的差異。',
      evidence: [
        '只讀取公開地址與鏈上公開資料',
        '不要求交易、Token Approval 或簽名',
        '你可以隨時中斷連線'
      ]
    }
  }

  const position = displayPosition.value
  const rate = currentPositionRate.value
  const higherCount = higherYieldCandidates.value.length
  // Neutral observational state only — higher yield does not imply attention.
  const level: DecisionLevel = 'healthy'

  if (!rate) {
    return {
      level,
      question: '今天有什麼需要我注意？',
      headline: `目前部位：${position.protocol} ${position.product}`,
      statement: '已取得候選資料，但暫時無法對應目前部位的市場觀察利率，因此尚不能計算與市場的差距。',
      evidence: [
        `目前 ${position.amount.toLocaleString('en-US')} ${position.asset}（示意部位，非錢包讀取）`,
        '部位利率需待對應後才能比較'
      ]
    }
  }

  const evidence = [
    `目前部位觀察利率 ${formatMarketRate(rate.rate, rate.rateType)}`,
    `同 ${rate.rateType} 且高於目前部位的候選：${higherCount} 個`
  ]

  if (higherCount > 0) {
    const top = higherYieldCandidates.value[0]
    if (top) {
      const diff = Number((top.rate - rate.rate).toFixed(2))
      evidence.push(
        `目前觀察到的最大差距：${top.protocol} ${top.product} ${formatSignedRateDiff(diff)}`
      )
    }
  }

  return {
    level,
    question: '今天有什麼需要我注意？',
    headline: higherCount > 0
      ? `目前觀察到 ${higherCount} 個同單位下高於你目前部位的 USDC 選項`
      : `目前未觀察到同單位下高於 ${position.protocol} 部位的 USDC 選項`,
    statement: higherCount > 0
      ? '以下為事實摘要，詳細比較見下方。這不是搬倉建議。'
      : `以目前示意部位與可比較候選對照，尚未看到高於 ${formatMarketRate(rate.rate, rate.rateType)} 的選項。`,
    evidence
  }
})

const isHealthy = computed(() => hero.value.level === 'healthy')
</script>

<template>
  <div class="page">
    <header class="header">
      <div class="header-inner">
        <div class="brand">
          <span class="mark">D</span>
          <span class="name">DeFi OS</span>
        </div>
        <div class="header-actions">
          <p class="greeting">{{ dashboard.greeting }}，{{ dashboard.date }}</p>
          <button
            type="button"
            class="theme-toggle"
            :aria-label="toggleLabel"
            @click="toggleTheme"
          >
            {{ toggleLabel }}
          </button>
          <WalletReadOnlyConnect />
        </div>
      </div>
    </header>

    <main class="content">
      <section
        class="hero"
        :class="isHealthy ? 'hero-healthy' : 'hero-attention'"
      >
        <template v-if="decisionPending">
          <p class="hero-question">今天有什麼需要我注意？</p>
          <h1 class="hero-headline">正在取得個人 USDC 比較資料…</h1>
          <p class="hero-statement">
            正在載入比較資料，請稍候。
          </p>
        </template>

        <template v-else-if="decisionError">
          <p class="hero-question">今天有什麼需要我注意？</p>
          <h1 class="hero-headline">
            <span class="hero-dot">🟡</span>
            目前無法取得個人 USDC 比較資料
          </h1>
          <p class="hero-statement">
            暫時無法載入個人比較資料。下方市場區塊仍可能獨立可用。
          </p>
        </template>

        <template v-else>
          <p class="hero-question">{{ hero.question }}</p>
          <h1 class="hero-headline">
            <span class="hero-dot">{{ !isWalletConnected ? '○' : isHealthy ? '🟢' : '🟡' }}</span>
            {{ hero.headline }}
          </h1>
          <p class="hero-statement">{{ hero.statement }}</p>

          <ul class="evidence">
            <li
              v-for="item in hero.evidence"
              :key="item"
            >
              {{ item }}
            </li>
          </ul>
        </template>
      </section>

      <section class="section wallet-gated-section">
        <div class="section-head portfolio-section-head">
          <div>
            <h2>投資組合</h2>
            <p>{{ isWalletConnected ? '我的資產現在在哪裡？' : '連接後，這裡會整理你的鏈上資產與 DeFi 部位。' }}</p>
          </div>
        </div>
        <div v-if="isWalletConnected" class="grid grid-4">
          <SummaryCard
            v-for="item in dashboard.portfolio"
            :key="item.label"
            :label="item.label"
            :value="item.value"
            :note="item.note"
          />
        </div>
        <div v-else class="wallet-empty-state">
          <div class="wallet-empty-icon" aria-hidden="true">◎</div>
          <div>
            <strong>尚未連接錢包</strong>
            <p>請從右上角連接錢包。完成後，我們只使用公開地址查詢鏈上資料。</p>
          </div>
        </div>
      </section>

      <section class="section wallet-gated-section">
        <div class="section-head">
          <h2>你的 USDC</h2>
          <p>我的目前部位跟市場差多少？</p>
        </div>

        <div v-if="!isWalletConnected" class="wallet-empty-state compact">
          <div class="wallet-empty-icon" aria-hidden="true">$</div>
          <div>
            <strong>連接後才能比較你的 USDC 部位</strong>
            <p>我們會先辨識你持有 USDC 的鏈與協議，再與相同口徑的市場產品比較。</p>
          </div>
        </div>

        <template v-else>
          <div class="current-position">
          <p class="current-label">目前部位（示意 fixture，非錢包讀取）</p>
          <p class="current-value">
            {{ displayPosition.amount.toLocaleString('en-US') }} {{ displayPosition.asset }}
            · {{ displayPosition.protocol }}
            · {{ displayPosition.product }}
            <template v-if="currentPositionRate">
              · {{ formatMarketRate(currentPositionRate.rate, currentPositionRate.rateType) }}
            </template>
            <template v-else>
              · 利率待對應
            </template>
          </p>
        </div>

        <p
          v-if="decisionPending"
          class="market-status"
        >
          正在取得個人比較資料…
        </p>

        <p
          v-else-if="decisionError"
          class="market-status market-status-error"
        >
          目前無法取得個人 USDC 比較資料。
        </p>

        <p
          v-else-if="!currentPositionRate"
          class="market-status"
        >
          已取得候選資料，但目前部位缺少市場觀察利率，暫不顯示差距列表。
        </p>

        <p
          v-else-if="personalComparisonRows.length === 0"
          class="market-status"
        >
          目前沒有同單位下高於你目前部位的候選機會。
        </p>

        <template v-else>
          <ul class="opportunities">
            <OpportunityRow
              v-for="row in personalComparisonRows"
              :key="row.key"
              :protocol="row.protocol"
              :product="row.product"
              :apr-label="row.aprLabel"
              :tvl-label="row.tvlLabel"
              :meta-label="row.metaLabel"
              :is-current="row.isCurrent"
              :apr-diff-label="row.aprDiffLabel"
              :annual-diff-label="row.annualDiffLabel"
            />
          </ul>

          <p
            v-if="higherYieldCandidates.length > PERSONAL_HIGHER_YIELD_DISPLAY_LIMIT"
            class="market-notice"
          >
            列表僅顯示同單位下較高收益候選前 {{ PERSONAL_HIGHER_YIELD_DISPLAY_LIMIT }} 筆。
          </p>
          <p class="market-notice">
            年化差額依示意部位估算，不是保證收益。
          </p>
          </template>
        </template>
      </section>

      <section class="section">
        <div class="section-head market-section-head">
          <div>
            <h2>DeFi 市場</h2>
            <p>{{ marketScopeLabel }}</p>
          </div>
          <button
            type="button"
            class="market-refresh"
            :disabled="marketRefreshing || marketUpdating"
            @click="refreshMarket"
          >
            {{ marketRefreshing ? '更新中…' : '重新整理' }}
          </button>
        </div>

        <MarketFilterPanel
          :chains="marketChains"
          :assets="marketAssets"
          :options="chainOptions"
          @change="applyMarketScope"
        />

        <div class="market-filter-actions">
          <button
            type="button"
            class="market-clear-all"
            :class="{ busy: marketRefreshing || marketUpdating }"
            :disabled="!hasActiveMarketFilters || marketRefreshing || marketUpdating"
            @click="clearAllMarketFilters"
          >
            清除所有篩選
          </button>
        </div>

        <div class="market-tools">
          <div class="market-presets" aria-label="快速資產篩選">
            <button type="button" :class="{ active: isAssetPresetActive([]) }" @click="applyAssetPreset([])">全部</button>
            <button type="button" :class="{ active: isAssetPresetActive(['USDC', 'USDT']) }" @click="applyAssetPreset(['USDC', 'USDT'])">穩定幣</button>
            <button type="button" :class="{ active: isAssetPresetActive(['ETH']) }" @click="applyAssetPreset(['ETH'])">ETH</button>
            <button type="button" :class="{ active: isAssetPresetActive(['BTC']) }" @click="applyAssetPreset(['BTC'])">BTC</button>
          </div>
          <form class="market-search" role="search" @submit.prevent="applyMarketSearch">
            <input v-model="marketSearchDraft" type="search" maxlength="80" placeholder="搜尋協議、產品、鏈或資產…" aria-label="搜尋市場產品">
            <button v-if="marketSearchDraft || marketSearch" type="button" class="search-clear" @click="clearMarketSearch">清除</button>
            <button type="submit">搜尋</button>
          </form>
          <div class="market-sort-controls">
            <label class="market-sort">
              <span>排序</span>
              <select v-model="marketSort" aria-label="市場排序方式" @change="applyMarketSort">
                <option value="tvl">TVL 最高</option>
                <option value="rate">收益率最高</option>
                <option value="protocol">協議名稱</option>
              </select>
            </label>
            <label v-if="marketSort === 'rate'" class="market-sort rate-type">
              <span>口徑</span>
              <select v-model="marketRateType" aria-label="收益率口徑" @change="applyMarketSort">
                <option value="APY">APY</option>
                <option value="APR">APR</option>
              </select>
            </label>
          </div>
        </div>

        <p v-if="marketSearchResultLabel" class="market-result-count">{{ marketSearchResultLabel }}</p>
        <p v-if="marketUpdating" class="market-updating" role="status">正在更新市場結果…</p>

        <p class="market-scope">
          {{ marketRankingLabel }}
        </p>

        <div class="market-method-note">
          <span>排名與收錄規則</span>
          <button
            type="button"
            class="method-help"
            aria-label="查看排名與收錄規則"
            aria-describedby="market-method-tooltip"
          >
            !
            <span id="market-method-tooltip" class="method-tooltip" role="tooltip">
              收錄 TVL 1,000 萬美元以上的單一資產收益產品；首頁先顯示排名較前的協議，展開後可繼續查看該協議的合格產品。官方 API／鏈上資料優先，其他候選會標示第三方資料。APR 與 APY 口徑不同，不直接互相比較。
            </span>
          </button>
        </div>

        <p
          v-if="marketPending"
          class="market-status"
        >
          正在取得市場資料…
        </p>

        <p
          v-else-if="marketError"
          class="market-status market-status-error"
        >
          目前無法取得市場資料。
        </p>

        <template v-else>
          <p
            v-if="hasPartialProviderFailure"
            class="market-notice"
          >
            部分官方來源暫時無法更新。<template v-if="fallbackProtocolNames.length">
              {{ fallbackProtocolNames.join('、') }} 包含已標示的第三方資料。
            </template>
          </p>

          <p
            v-if="marketDashboard?.meta.cacheFallback"
            class="market-notice"
          >
            上游暫時無法更新，目前顯示最近一次成功資料。
          </p>

          <p v-if="visibleMarketGroups.length === 0" class="market-status">
            目前沒有符合這組篩選條件的市場產品。
          </p>

          <div v-else class="market-list">
            <MarketProtocolGroup
              v-for="group in visibleMarketGroups"
              :key="group.protocol"
              :protocol="group.protocol"
              :rows="group.rows"
              :tvl-label="group.tvlLabel"
              :source-label="group.sourceLabel"
              :source-tone="group.sourceTone"
              :source-help="group.sourceHelp"
            />
          </div>

          <button
            v-if="hasMoreMarketProtocols"
            type="button"
            class="market-more"
            @click="toggleMarketProtocols"
          >
            {{ showAllMarketProtocols
              ? `收合至前 ${MARKET_INITIAL_PROTOCOL_LIMIT} 個協議`
              : `顯示全部 ${marketGroups.length} 個協議` }}
          </button>

          <details
            v-if="marketDashboard?.excluded.length"
            class="market-excluded"
          >
            <summary>
              {{ marketDashboard.excluded.length }} 個市場項目未納入排名
            </summary>
            <div class="market-excluded-list">
              <article
                v-for="item in marketDashboard.excluded"
                :key="`${item.protocol}:${item.sourcePoolId ?? item.product}`"
                class="market-excluded-item"
              >
                <div>
                  <a
                    v-if="item.productUrl"
                    :href="item.productUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                  >{{ item.protocol }} · {{ item.product }}</a>
                  <strong v-else>{{ item.protocol }} · {{ item.product }}</strong>
                  <p>{{ item.reason }}</p>
                  <p class="market-excluded-disclaimer">這是資料品質檢查，不代表協議安全性評價。</p>
                </div>
                <dl>
                  <div>
                    <dt>目前</dt>
                    <dd>{{ item.currentRate.toFixed(2) }}% {{ item.rateType }}</dd>
                  </div>
                  <div>
                    <dt>近 30 日平均</dt>
                    <dd>{{ item.referenceRate.toFixed(2) }}% {{ item.rateType }}</dd>
                  </div>
                </dl>
              </article>
            </div>
          </details>

          <p
            v-if="marketRefreshMessage"
            class="market-refresh-message"
            aria-live="polite"
          >
            {{ marketRefreshMessage }}
          </p>

          <p
            v-if="marketFetchedAtLabel"
            class="market-fetched"
          >
            資料更新時間 {{ marketFetchedAtLabel }}
          </p>
        </template>
      </section>

      <section class="section">
        <div class="section-head">
          <h2>鏈上事件</h2>
          <p>值得留意的變化</p>
        </div>
        <ul class="events">
          <li
            v-for="event in dashboard.events"
            :key="event.title"
            class="event"
          >
            <span class="event-marker" :class="`event-marker-${eventTone(event.type)}`" aria-hidden="true" />
            <div class="event-main">
              <p class="event-meta">
                <span class="event-type" :class="`event-type-${eventTone(event.type)}`">{{ event.type }}</span>
                <time>{{ event.time }}</time>
              </p>
              <p class="event-title">{{ event.title }}</p>
              <p class="event-protocol">{{ event.protocol }}</p>
            </div>
            <span class="event-attention">{{ event.attention }}</span>
          </li>
        </ul>
      </section>
    </main>

    <footer class="footer">
      <p>資料為示意內容，最後更新 {{ dashboard.updatedAt }}</p>
      <p>DeFi OS 協助你理解已持有的資產，不提供投資建議。</p>
    </footer>
  </div>
</template>

<style scoped>
.page {
  max-width: 960px;
  margin: 0 auto;
  padding: 104px 24px 64px;
}

.header {
  position: fixed;
  z-index: 100;
  top: 0;
  right: 0;
  left: 0;
  border-bottom: 1px solid color-mix(in srgb, var(--color-border) 76%, transparent);
  background: color-mix(in srgb, var(--color-bg) 88%, transparent);
  backdrop-filter: blur(16px);
}

.header-inner {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  max-width: 960px;
  min-height: 68px;
  margin: 0 auto;
  padding: 10px 24px;
}

.brand {
  display: flex;
  gap: 10px;
  align-items: center;
}

.mark {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 9px;
  background: var(--color-mark-bg);
  color: var(--color-mark-fg);
  font-size: 0.9375rem;
  font-weight: 600;
}

.name {
  font-size: 1.0625rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.header-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.greeting {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.theme-toggle {
  margin: 0;
  padding: 6px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font: inherit;
  font-size: 0.8125rem;
  cursor: pointer;
}

.theme-toggle:focus-visible {
  outline: 2px solid var(--color-text-primary);
  outline-offset: 2px;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 56px;
  margin-top: 24px;
}

.header :deep(.wallet-connect) { align-items: center; }
.header :deep(.wallet-connect p) { display: none; }

.hero {
  padding: 40px;
  border: 1px solid var(--color-border);
  border-radius: 20px;
  background: var(--color-surface);
}

.hero-healthy {
  border-left: 3px solid var(--color-status-healthy);
}

.hero-attention {
  border-left: 3px solid var(--color-status-attention);
}

.hero-question {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.hero-headline {
  display: flex;
  gap: 12px;
  align-items: baseline;
  margin: 16px 0 0;
  font-size: 2rem;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.02em;
}

.hero-dot {
  font-size: 1.5rem;
}

.hero-statement {
  margin: 14px 0 0;
  font-size: 1.0625rem;
  color: var(--color-text-body);
}

.evidence {
  margin: 28px 0 0;
  padding: 24px 0 0;
  border-top: 1px solid var(--color-border-soft);
  list-style: none;
}

.evidence li {
  position: relative;
  padding-left: 16px;
  font-size: 0.9375rem;
  line-height: 1.9;
  color: var(--color-text-body);
}

.evidence li::before {
  position: absolute;
  left: 0;
  color: var(--color-bullet);
  content: '·';
}

.section-head h2 {
  margin: 0;
  font-size: 1.0625rem;
  font-weight: 600;
}

.section-head p {
  margin: 6px 0 0;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.grid {
  display: grid;
  gap: 16px;
  margin-top: 20px;
}

.grid-4 {
  grid-template-columns: repeat(4, 1fr);
}

.market-status {
  margin: 20px 0 0;
  padding: 18px 22px;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-surface);
  font-size: 0.9375rem;
  color: var(--color-text-body);
}

.market-status-error {
  color: var(--color-text-primary);
}

.market-notice {
  margin: 16px 0 0;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.market-section-head {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
}

.portfolio-section-head {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  justify-content: space-between;
}

.wallet-empty-state {
  box-sizing: border-box;
  display: flex;
  gap: 16px;
  align-items: center;
  min-height: 112px;
  margin-top: 16px;
  padding: 20px 24px;
  border: 1px dashed var(--color-border);
  border-radius: 16px;
  background: color-mix(in srgb, var(--color-surface) 72%, transparent);
}

.wallet-gated-section + .wallet-gated-section { margin-top: -12px; }
.wallet-empty-state.compact { min-height: 96px; }
.wallet-empty-state strong { color: var(--color-text-primary); font-size: .9375rem; }
.wallet-empty-state p { margin: 6px 0 0; color: var(--color-text-muted); font-size: .8125rem; line-height: 1.55; }
.wallet-empty-icon { display: grid; flex: 0 0 auto; place-items: center; width: 38px; height: 38px; border: 1px solid color-mix(in srgb, #168f87 48%, var(--color-border)); border-radius: 50%; color: #168f87; font-weight: 700; }

.market-filter-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 6px;
}

.market-refresh,
.market-more {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
}

.market-refresh {
  padding: 9px 14px;
  font: inherit;
  font-size: 0.8125rem;
}

.market-refresh:hover:not(:disabled),
.market-more:hover {
  border-color: var(--color-text-muted);
  color: var(--color-text-primary);
}

.market-refresh:disabled {
  cursor: wait;
  opacity: 0.65;
}

.market-clear-all {
  padding: 2px 4px;
  border: 0;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  font: inherit;
  font-size: 0.75rem;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.market-clear-all:hover:not(:disabled) { color: var(--color-text-primary); }
.market-clear-all:disabled { cursor: default; opacity: .6; }
.market-clear-all.busy:disabled { cursor: wait; }

.market-scope {
  margin: 14px 0 0;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.market-method-note {
  display: flex;
  gap: 6px;
  align-items: center;
  margin: 7px 0 0;
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--color-text-muted);
}

.method-help {
  position: relative;
  display: inline-grid;
  width: 17px;
  height: 17px;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  background: var(--color-surface);
  color: var(--color-text-muted);
  cursor: help;
  font: inherit;
  font-size: 0.6875rem;
  font-weight: 700;
  place-items: center;
}

.method-tooltip {
  position: absolute;
  z-index: 20;
  top: calc(100% + 8px);
  left: 50%;
  width: min(390px, calc(100vw - 48px));
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 9px;
  background: var(--color-surface);
  box-shadow: 0 10px 28px rgb(0 0 0 / 18%);
  color: var(--color-text-body);
  font-size: 0.75rem;
  font-weight: 400;
  line-height: 1.55;
  opacity: 0;
  pointer-events: none;
  text-align: left;
  transform: translate(-18px, -3px);
  transition: opacity 140ms ease, transform 140ms ease;
}

.method-help:hover .method-tooltip,
.method-help:focus-visible .method-tooltip {
  opacity: 1;
  transform: translate(-18px, 0);
}

.market-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.market-filter {
  display: inline-flex;
  gap: 7px;
  align-items: center;
  padding: 7px 10px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-surface);
  font-size: 0.8125rem;
  color: var(--color-text-body);
}

.market-filter span {
  color: var(--color-text-muted);
}

.market-more {
  width: 100%;
  margin-top: 12px;
  padding: 11px 16px;
  font: inherit;
  font-size: 0.875rem;
}

.market-refresh-message {
  margin: 12px 0 0;
  font-size: 0.8125rem;
  color: var(--color-text-body);
}

.market-list {
  margin: 16px 0 0;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-surface);
  list-style: none;
  overflow: hidden;
}

.market-fetched {
  margin: 12px 0 0;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.market-excluded {
  margin-top: 16px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
  color: var(--color-text-body);
}

.market-excluded summary {
  padding: 13px 16px;
  cursor: pointer;
  font-size: 0.8125rem;
}

.market-excluded-list {
  border-top: 1px solid var(--color-border-subtle);
}

.market-excluded-item {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 20px;
  padding: 16px;
}

.market-excluded-item a,
.market-excluded-item strong {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.market-excluded-item p {
  margin: 6px 0 0;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--color-text-muted);
}

.market-excluded-item .market-excluded-disclaimer {
  font-size: 0.75rem;
}

.market-excluded-item dl {
  display: flex;
  gap: 18px;
  margin: 0;
  text-align: right;
}

.market-excluded-item dt {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.market-excluded-item dd {
  margin: 4px 0 0;
  white-space: nowrap;
  font-size: 0.8125rem;
  color: var(--color-text-body);
}

@media (max-width: 600px) {
  .market-excluded-item {
    grid-template-columns: 1fr;
  }

  .market-excluded-item dl {
    text-align: left;
  }
}

.current-position {
  margin-top: 20px;
  padding: 18px 22px;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-surface);
}

.current-label {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.current-value {
  margin: 8px 0 0;
  font-size: 1.0625rem;
  font-weight: 600;
  line-height: 1.5;
  color: var(--color-text-primary);
}

.opportunities {
  margin: 16px 0 0;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-surface);
  list-style: none;
  overflow: hidden;
}

.events {
  margin: 20px 0 0;
  padding: 0;
  list-style: none;
}

.event {
  position: relative;
  display: flex;
  gap: 18px;
  align-items: flex-start;
  justify-content: space-between;
  margin-left: 7px;
  padding: 0 0 28px 28px;
}

.event:not(:last-child)::before {
  position: absolute;
  top: 11px;
  bottom: -2px;
  left: 0;
  width: 1px;
  background: var(--color-border);
  content: '';
}

.event-marker {
  position: absolute;
  z-index: 1;
  top: 5px;
  left: -5px;
  width: 11px;
  height: 11px;
  border: 3px solid var(--color-background);
  border-radius: 50%;
  background: var(--color-text-muted);
  box-shadow: 0 0 0 1px var(--color-border);
}

.event-marker-protocol { background: #168f87; }
.event-marker-governance { background: #7167d9; }
.event-marker-market { background: #b7791f; }

.event-main {
  min-width: 0;
  flex: 1;
}

.event-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  align-items: center;
  margin: 0;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.event-type {
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--color-surface-soft);
  color: var(--color-text-body);
  font-size: 0.75rem;
}

.event-type-protocol { color: #168f87; }
.event-type-governance { color: #7167d9; }
.event-type-market { color: #a56813; }

.event-title {
  margin: 9px 0 0;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.45;
  color: var(--color-text-primary);
}

.event-protocol {
  margin: 5px 0 0;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.event-attention {
  flex-shrink: 0;
  margin-top: 2px;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.footer {
  margin-top: 64px;
  padding-top: 24px;
  border-top: 1px solid var(--color-border-soft);
}

.footer p {
  margin: 0 0 6px;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.market-tools { display: flex; gap: 12px; align-items: center; justify-content: space-between; margin-top: 12px; }
.market-presets { display: flex; flex-wrap: wrap; gap: 7px; }
.market-presets button { padding: 7px 12px; border: 1px solid var(--color-border); border-radius: 999px; background: var(--color-surface); color: var(--color-text-secondary); cursor: pointer; font: inherit; font-size: .8125rem; }
.market-presets button.active { border-color: #627eea; background: color-mix(in srgb, #627eea 13%, transparent); color: var(--color-text-primary); }
.market-search { display: flex; min-width: min(360px, 100%); }
.market-search input { min-width: 0; flex: 1; padding: 9px 12px; border: 1px solid var(--color-border); border-right: 0; border-radius: 10px 0 0 10px; background: var(--color-surface); color: var(--color-text-primary); font: inherit; }
.market-search button { padding: 9px 14px; border: 1px solid var(--color-border); border-radius: 0; background: var(--color-surface-soft); color: var(--color-text-primary); cursor: pointer; font: inherit; }
.market-search button:last-child { border-radius: 0 10px 10px 0; }
.market-search .search-clear { border-right: 0; color: var(--color-text-muted); }
.market-sort-controls { display: flex; gap: 8px; align-items: center; }
.market-sort { display: flex; gap: 7px; align-items: center; white-space: nowrap; font-size: .8125rem; color: var(--color-text-muted); }
.market-sort select { padding: 9px 30px 9px 10px; border: 1px solid var(--color-border); border-radius: 10px; background: var(--color-surface); color: var(--color-text-primary); cursor: pointer; font: inherit; }
.market-result-count, .market-updating { margin: 10px 0 0; font-size: .8125rem; color: var(--color-text-muted); }
.market-updating { color: var(--color-text-secondary); }

@media (max-width: 760px) {
  .page { padding-top: 92px; }
  .header-inner { min-height: 60px; padding: 8px 16px; }
  .greeting { display: none; }
  .header-actions { gap: 8px; }
  .theme-toggle { padding: 7px 9px; }
  .header :deep(.connect-button),
  .header :deep(.setup-button) { padding: 8px 10px; }
  .portfolio-section-head { flex-direction: column; }
  .market-tools { align-items: stretch; flex-direction: column; }
  .market-search { min-width: 100%; }
  .market-sort-controls { flex-wrap: wrap; }
  .grid-4 {
    grid-template-columns: repeat(2, 1fr);
  }

  .hero {
    padding: 28px 24px;
  }

  .hero-headline {
    font-size: 1.625rem;
  }

  .current-value {
    font-size: 0.975rem;
  }
}

@media (max-width: 480px) {
  .market-section-head {
    align-items: flex-start;
  }

  .grid-4 {
    grid-template-columns: 1fr;
  }
}
</style>
