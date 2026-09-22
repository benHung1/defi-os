<script setup lang="ts">
import type { PortfolioPosition } from '../../shared/types/portfolio'
import type {
  ChainEventRecord,
  ChainEventResponse,
  ChainEventSeverity,
  ChainEventType
} from '../../shared/types/chainEvents'
import { evaluateDailyDecision, type DailyDecisionInput } from '../utils/dailyDecision'
import { productDetailPath } from '../utils/productDetail'

interface SummaryItem {
  label: string
  value: string
  note: string
}

interface Dashboard {
  greeting: string
  date: string
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
  positionReadable?: boolean
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

interface UsdcDecisionCandidateResponse {
  currentPosition: {
    asset: 'USDC'
    protocol: string
    product: string
    opportunityType: OpportunityType
    chain: string
    amount: number
    rate?: number
    rateType?: RateType
  }
  currentPositionRate: { rate: number, rateType: RateType } | null
  candidates: YieldOpportunity[]
  meta: YieldResponseMeta
}

const MARKET_ALL_PRODUCT_LIMIT = 100
const MARKET_INITIAL_PROTOCOL_LIMIT = 5
const dashboard: Dashboard = {
  greeting: '早安',
  date: new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Taipei'
  }).format(new Date())
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

function eventTypeLabel (type: ChainEventType): string {
  return ({
    SECURITY: '安全事件',
    PAUSE: '合約狀態',
    UPGRADE: '協議升級',
    GOVERNANCE: '治理結果'
  })[type]
}

function eventSeverityLabel (severity: ChainEventSeverity): string {
  return ({
    CRITICAL: '立即查看',
    WATCH: '需要了解',
    INFO: '資訊更新'
  })[severity]
}

function eventTone (severity: ChainEventSeverity): string {
  return ({ CRITICAL: 'critical', WATCH: 'watch', INFO: 'info' })[severity]
}

function eventScopeLabel (event: ChainEventRecord): string {
  const scope = [...event.chains, ...event.assets]
  return scope.length ? scope.join(' · ') : '協議層級'
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
const { address: walletAddress, isConnected: isWalletConnected } = useWalletSession()
const { portfolio: walletPortfolio, pending: portfolioPending, error: portfolioError, refresh: refreshPortfolio } = usePortfolio()
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

const marketGroups = computed(() => {
  const payload = marketDashboard.value
  if (!payload) {
    return []
  }

  const groups = new Map<string, {
    protocol: string
    totalTvlUsd: number
    sourceKinds: Set<DataSourceKind>
    supportsWalletPosition: boolean
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
      detailUrl: string
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
      supportsWalletPosition: false,
      rows: []
    }
    group.totalTvlUsd += opportunity.tvlUsd ?? 0
    group.sourceKinds.add(opportunity.sourceKind)
    group.supportsWalletPosition ||= opportunity.positionReadable === true
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
      detailUrl: productDetailPath({
        protocol: opportunity.protocol,
        product: opportunity.product,
        chain: opportunity.chain,
        asset: opportunity.asset,
        sourcePoolId: opportunity.sourcePoolId
      }),
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
      positionSupportLabel: group.supportsWalletPosition
        ? '支援持倉辨識' as const
        : '僅市場資料' as const,
      positionSupportHelp: group.supportsWalletPosition
        ? '已接入唯讀持倉 adapter；連接錢包後會從 Ethereum 鏈上核對實際部位。'
        : '目前提供市場排名資料，尚未接入此協議的錢包持倉辨識。',
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

const walletAssets = computed(() => walletPortfolio.value?.chains.flatMap(chain => chain.assets) ?? [])
const walletPositions = computed(() => walletPortfolio.value?.positions ?? [])
const walletUsdc = computed(() => walletAssets.value.find(asset => asset.symbol === 'USDC')?.amount ?? 0)
const usdcPositions = computed(() => walletPositions.value.filter(position => position.asset.toUpperCase() === 'USDC'))
const comparableUsdcPositions = computed(() => usdcPositions.value.filter(position =>
  (position.kind === 'SUPPLY' || position.kind === 'VAULT') && position.amount > 0
))
const usdcPositionKey = (position: PortfolioPosition): string =>
  `${position.protocol}:${position.product}:${position.kind}:${position.chain}:${position.contractAddress}`
const selectedUsdcPositionKey = ref('')
const selectedUsdcPosition = computed(() => comparableUsdcPositions.value.find(position =>
  usdcPositionKey(position) === selectedUsdcPositionKey.value
) ?? comparableUsdcPositions.value[0] ?? null)
const usdcDecision = ref<UsdcDecisionCandidateResponse | null>(null)
const usdcDecisionPending = ref(false)
const usdcDecisionError = ref<string | null>(null)
let usdcDecisionRequestId = 0

function positionOpportunityType (position: PortfolioPosition): OpportunityType {
  if (position.kind === 'SUPPLY') return 'LENDING_SUPPLY'
  if (position.protocol === 'Spark' && position.product.toLocaleLowerCase().includes('savings')) return 'SAVINGS'
  return 'CURATED_VAULT'
}

async function refreshUsdcDecision (): Promise<void> {
  const position = selectedUsdcPosition.value
  const requestId = ++usdcDecisionRequestId
  usdcDecision.value = null
  usdcDecisionError.value = null

  if (!position || position.rate === null || position.rateType === null) {
    usdcDecisionPending.value = false
    return
  }

  usdcDecisionPending.value = true
  try {
    const response = await $fetch<UsdcDecisionCandidateResponse>('/api/decision/usdc', {
      query: {
        protocol: position.protocol,
        product: position.product,
        opportunityType: positionOpportunityType(position),
        chain: position.chain,
        amount: position.amount,
        rate: position.rate,
        rateType: position.rateType
      }
    })
    if (requestId === usdcDecisionRequestId) usdcDecision.value = response
  } catch {
    if (requestId === usdcDecisionRequestId) usdcDecisionError.value = '目前無法取得同口徑市場比較，請稍後再試。'
  } finally {
    if (requestId === usdcDecisionRequestId) usdcDecisionPending.value = false
  }
}

watch(comparableUsdcPositions, (positions) => {
  if (!positions.some(position => usdcPositionKey(position) === selectedUsdcPositionKey.value)) {
    selectedUsdcPositionKey.value = positions[0] ? usdcPositionKey(positions[0]) : ''
  }
}, { immediate: true })

watch(selectedUsdcPosition, () => {
  void refreshUsdcDecision()
}, { immediate: true })

const selectedUsdcAnnualYield = computed(() => {
  const position = selectedUsdcPosition.value
  if (!position || position.rate === null) return null
  return (position.valueUsd ?? position.amount) * position.rate / 100
})
const formatAnnualUsd = (value: number): string => `US$${value.toLocaleString('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})}`
const candidateRateDifference = (candidate: YieldOpportunity): number => {
  const currentRate = usdcDecision.value?.currentPositionRate?.rate
  return currentRate === undefined ? 0 : candidate.rate - currentRate
}
const candidateAnnualDifference = (candidate: YieldOpportunity): number => {
  const position = selectedUsdcPosition.value
  if (!position) return 0
  return (position.valueUsd ?? position.amount) * candidateRateDifference(candidate) / 100
}
const protocolNames = computed(() => [...new Set(walletPositions.value.map(position => position.protocol))])
const eventProtocols = computed(() => [...new Set(walletPositions.value.map(position => position.protocol))])
const eventChains = computed(() => [...new Set(walletPositions.value.map(position => position.chain))])
const eventAssets = computed(() => [...new Set(walletPositions.value.map(position => position.asset.toUpperCase()))])
const chainEventResponse = ref<ChainEventResponse | null>(null)
const chainEventsPending = ref(false)
const chainEventsError = ref<string | null>(null)
let chainEventRequestId = 0
let chainEventRefreshTimer: ReturnType<typeof setInterval> | undefined

async function refreshChainEvents (): Promise<void> {
  const requestId = ++chainEventRequestId
  chainEventsError.value = null

  if (!isWalletConnected.value || eventProtocols.value.length === 0) {
    chainEventResponse.value = null
    chainEventsPending.value = false
    return
  }

  chainEventsPending.value = true
  try {
    const response = await $fetch<ChainEventResponse>('/api/events', {
      query: {
        protocols: eventProtocols.value.join(','),
        chains: eventChains.value.join(','),
        assets: eventAssets.value.join(','),
        limit: 5
      }
    })
    if (requestId === chainEventRequestId) chainEventResponse.value = response
  } catch {
    if (requestId === chainEventRequestId) {
      chainEventsError.value = '目前無法取得正式事件來源，請稍後再試。'
    }
  } finally {
    if (requestId === chainEventRequestId) chainEventsPending.value = false
  }
}

watch([isWalletConnected, eventProtocols, eventChains, eventAssets], () => {
  void refreshChainEvents()
}, { immediate: true })

onMounted(() => {
  chainEventRefreshTimer = setInterval(() => {
    if (document.visibilityState === 'visible') void refreshChainEvents()
  }, 5 * 60 * 1000)
})

onBeforeUnmount(() => {
  if (chainEventRefreshTimer) clearInterval(chainEventRefreshTimer)
})

const currentChainEventResponse = computed(() => {
  const response = chainEventResponse.value
  if (!response || response.meta.requestedProtocols.length !== eventProtocols.value.length) return null
  const requested = new Set(response.meta.requestedProtocols)
  return eventProtocols.value.every(protocol => requested.has(protocol)) ? response : null
})
const chainEvents = computed(() => currentChainEventResponse.value?.data ?? [])
const chainEventCoverage = computed(() => currentChainEventResponse.value?.meta.coverage ?? [])
const coveredEventProtocols = computed(() => chainEventCoverage.value.filter(item => item.status === 'supported').map(item => item.protocol))
const uncoveredEventProtocols = computed(() => chainEventCoverage.value.filter(item => item.status === 'unavailable').map(item => item.protocol))
const chainEventProviderFailed = computed(() => currentChainEventResponse.value?.meta.providers.some(provider =>
  provider.status === 'error'
) ?? false)
const chainEventProvidersUnavailable = computed(() => {
  const providers = currentChainEventResponse.value?.meta.providers ?? []
  if (eventProtocols.value.length > 0 && coveredEventProtocols.value.length === 0) return true
  return providers.length > 0 && providers.every(provider => provider.status === 'error')
})
const chainEventFetchedAt = computed(() => currentChainEventResponse.value?.meta.fetchedAt
  ? formatFetchedAt(currentChainEventResponse.value.meta.fetchedAt)
  : '')
const bestUsdcCandidate = computed(() => {
  const candidates = usdcDecision.value?.candidates ?? []
  return candidates.reduce<YieldOpportunity | null>((best, candidate) => {
    if (candidateRateDifference(candidate) <= 0) return best
    if (!best || candidateRateDifference(candidate) > candidateRateDifference(best)) return candidate
    return best
  }, null)
})
const dailyDecisionInput = computed<DailyDecisionInput>(() => {
  const portfolio = walletPortfolio.value
  const bestCandidate = bestUsdcCandidate.value
  const eventProviders = currentChainEventResponse.value?.meta.providers ?? []

  return {
    connected: isWalletConnected.value,
    portfolio: {
      status: !isWalletConnected.value
        ? 'idle'
        : portfolioPending.value
          ? 'loading'
          : portfolioError.value || !portfolio
            ? 'error'
            : 'ready',
      error: portfolioError.value ?? undefined,
      addressLabel: walletAddress.value
        ? `${walletAddress.value.slice(0, 6)}…${walletAddress.value.slice(-4)}`
        : undefined,
      assetCount: portfolio?.summary.assetCount ?? 0,
      positionCount: portfolio?.positions.length ?? 0,
      protocolCount: portfolio?.summary.protocolCount ?? 0,
      partial: portfolio?.meta.partial ?? false
    },
    events: {
      status: !isWalletConnected.value || (portfolio?.positions.length ?? 0) === 0
        ? 'idle'
        : chainEventsPending.value
          ? 'loading'
          : chainEventsError.value
            ? 'error'
            : currentChainEventResponse.value
              ? 'ready'
              : 'idle',
      supportedProtocolCount: coveredEventProtocols.value.length,
      providerPartial: uncoveredEventProtocols.value.length > 0
        || (eventProviders.some(provider => provider.status === 'error')
          && eventProviders.some(provider => provider.status === 'ok')),
      providersUnavailable: chainEventProvidersUnavailable.value,
      items: chainEvents.value.map(event => ({
        id: event.id,
        type: event.type,
        severity: event.severity,
        protocol: event.protocol,
        title: event.title,
        source: event.source
      }))
    },
    comparison: {
      status: !selectedUsdcPosition.value
        ? 'idle'
        : usdcDecisionPending.value
          ? 'loading'
          : usdcDecisionError.value
            ? 'error'
            : usdcDecision.value
              ? 'ready'
              : 'idle',
      candidateCount: usdcDecision.value?.candidates.length ?? 0,
      bestRateDelta: bestCandidate ? candidateRateDifference(bestCandidate) : null,
      bestAnnualDeltaUsd: bestCandidate ? candidateAnnualDifference(bestCandidate) : null,
      rateType: usdcDecision.value?.currentPositionRate?.rateType ?? null
    }
  }
})
const hero = computed(() => evaluateDailyDecision(dailyDecisionInput.value))
const positionKindLabel = (kind: string): string => ({
  SUPPLY: '供應', BORROW: '借款', COLLATERAL: '抵押', VAULT: 'Vault'
})[kind] ?? kind
const formatPositionAmount = (amount: number, asset: string): string =>
  `${amount.toLocaleString('en-US', { maximumFractionDigits: 4 })} ${asset}`
const formatPositionValue = (value: number | null): string => value === null
  ? '美元價值暫缺'
  : `US$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
const formatPositionRate = (rate: number | null, rateType: string | null): string => rate === null || !rateType
  ? '利率不適用'
  : `${rate.toFixed(2)}% ${rateType}`
const positionDetailPath = (position: PortfolioPosition): string => productDetailPath({
  protocol: position.protocol,
  product: position.product,
  chain: position.chain,
  asset: position.asset,
  sourcePoolId: position.contractAddress
})
const portfolioSummaryItems = computed<SummaryItem[]>(() => {
  const portfolio = walletPortfolio.value
  if (!portfolio) return []
  const symbols = walletAssets.value.map(asset => asset.symbol).join('、') || '未找到已支援資產'
  const totalValue = portfolio.summary.totalUsd === null
    ? '價格不完整'
    : `US$${portfolio.summary.totalUsd.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
  return [
    { label: '投資組合價值', value: totalValue, note: 'Ethereum 主要資產合計' },
    { label: '資產', value: `${portfolio.summary.assetCount} 種`, note: symbols },
    { label: '協議', value: `${portfolio.summary.protocolCount} 個`, note: protocolNames.value.join('、') || '未找到已支援協議部位' },
    { label: '鏈', value: `${portfolio.summary.chainCount} 條`, note: portfolio.summary.chainCount ? 'Ethereum' : '未找到資產' }
  ]
})
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
        :class="`hero-${hero.tone}`"
      >
        <p class="hero-question">{{ hero.question }}</p>
        <h1 class="hero-headline">
          <span class="hero-dot" :class="`hero-dot-${hero.tone}`" aria-hidden="true" />
          {{ hero.headline }}
        </h1>
        <p class="hero-statement">{{ hero.statement }}</p>

        <ul class="evidence">
          <li
            v-for="item in hero.reasons"
            :key="`${item.code}:${item.text}`"
          >
            {{ item.text }}
            <small v-if="item.source">來源：{{ item.source }}</small>
          </li>
        </ul>

        <a
          v-if="hero.primaryAction"
          class="hero-action"
          :href="hero.primaryAction.target"
        >{{ hero.primaryAction.label }} ↓</a>
      </section>

      <section id="portfolio" class="section wallet-gated-section">
        <div class="section-head portfolio-section-head">
          <div>
            <h2>投資組合</h2>
            <p>{{ isWalletConnected ? '我的資產現在在哪裡？' : '連接後，這裡會整理你的鏈上資產與 DeFi 部位。' }}</p>
          </div>
        </div>
        <div v-if="isWalletConnected && portfolioPending" class="wallet-empty-state">
          <div class="wallet-empty-icon" aria-hidden="true">↻</div>
          <div>
            <strong>正在讀取鏈上資產</strong>
            <p>正在查詢 Ethereum 上的 ETH、USDC、USDT 與 WBTC。</p>
          </div>
        </div>
        <div v-else-if="isWalletConnected && portfolioError" class="wallet-empty-state">
          <div class="wallet-empty-icon" aria-hidden="true">!</div>
          <div>
            <strong>目前無法取得錢包資產</strong>
            <p>{{ portfolioError }}</p>
            <button type="button" class="inline-retry" @click="refreshPortfolio">重新嘗試</button>
          </div>
        </div>
        <div v-else-if="isWalletConnected" class="grid grid-4">
          <SummaryCard
            v-for="item in portfolioSummaryItems"
            :key="item.label"
            :label="item.label"
            :value="item.value"
            :note="item.note"
          />
        </div>
        <div
          v-if="isWalletConnected && !portfolioPending && !portfolioError && walletPositions.length > 0"
          class="portfolio-position-block"
        >
          <div class="position-list-head">
            <div>
              <h3>DeFi 部位明細</h3>
              <p>已辨識並完成鏈上核對的協議產品</p>
            </div>
            <span>{{ walletPositions.length }} 個部位</span>
          </div>
          <div class="position-list">
            <article
              v-for="position in walletPositions"
              :key="`${position.protocol}:${position.product}:${position.kind}:${position.asset}`"
              class="position-card"
            >
              <div>
                <p class="position-meta">{{ position.protocol }} · {{ positionKindLabel(position.kind) }}</p>
                <strong>{{ position.product }}</strong>
                <small>{{ position.verification === 'ONCHAIN' ? '鏈上直接讀取' : '官方索引發現 · 鏈上核對' }}</small>
                <NuxtLink class="position-detail-link" :to="positionDetailPath(position)">查看產品詳情</NuxtLink>
              </div>
              <div class="position-values">
                <strong>{{ formatPositionAmount(position.amount, position.asset) }}</strong>
                <span>{{ formatPositionValue(position.valueUsd) }} · {{ formatPositionRate(position.rate, position.rateType) }}</span>
              </div>
            </article>
          </div>
        </div>
        <div
          v-else-if="isWalletConnected && !portfolioPending && !portfolioError"
          class="wallet-empty-state"
        >
          <div class="wallet-empty-icon" aria-hidden="true">✓</div>
          <div>
            <strong>目前未找到已支援的 DeFi 部位</strong>
            <p>錢包資產已完成更新；目前沒有偵測到已接入協議中的供應、借款、抵押或 Vault 部位。</p>
          </div>
        </div>
        <div v-else-if="!isWalletConnected" class="wallet-empty-state">
          <div class="wallet-empty-icon" aria-hidden="true">◎</div>
          <div>
            <strong>尚未連接錢包</strong>
            <p>請從右上角連接錢包。完成後，我們只使用公開地址查詢鏈上資料。</p>
          </div>
        </div>
      </section>

      <section id="your-usdc" class="section wallet-gated-section">
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

        <div v-else-if="portfolioPending" class="wallet-empty-state compact">
          <div class="wallet-empty-icon" aria-hidden="true">↻</div>
          <div>
            <strong>正在確認 USDC 餘額</strong>
            <p>完成資產讀取後，這裡會顯示可用於後續協議比較的資料。</p>
          </div>
        </div>

        <div v-else-if="portfolioError" class="wallet-empty-state compact">
          <div class="wallet-empty-icon" aria-hidden="true">!</div>
          <div>
            <strong>目前無法確認 USDC 部位</strong>
            <p>{{ portfolioError }}</p>
          </div>
        </div>

        <div v-else-if="comparableUsdcPositions.length === 0" class="wallet-empty-state compact">
          <div class="wallet-empty-icon" aria-hidden="true">$</div>
          <div>
            <strong>{{ walletUsdc > 0 ? `錢包持有 ${walletUsdc.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDC` : '未找到 Ethereum USDC 餘額' }}</strong>
            <p>目前沒有已辨識的 USDC 供應或 Vault 部位；錢包現貨不會被當成 DeFi 收益部位比較。</p>
          </div>
        </div>

        <div v-else-if="selectedUsdcPosition" class="usdc-comparison">
          <div class="usdc-position-picker">
            <label for="usdc-position-select">
              <span>目前比較部位</span>
              <small>{{ comparableUsdcPositions.length }} 個可比較部位</small>
            </label>
            <select id="usdc-position-select" v-model="selectedUsdcPositionKey">
              <option
                v-for="position in comparableUsdcPositions"
                :key="usdcPositionKey(position)"
                :value="usdcPositionKey(position)"
              >
                {{ position.protocol }} · {{ position.product }}
              </option>
            </select>
          </div>

          <article class="usdc-current-card">
            <div class="usdc-current-identity">
              <p>{{ selectedUsdcPosition.protocol }} · {{ positionKindLabel(selectedUsdcPosition.kind) }}</p>
              <strong>{{ selectedUsdcPosition.product }}</strong>
              <small>{{ selectedUsdcPosition.chain }} · 已完成鏈上部位核對</small>
            </div>
            <dl class="usdc-current-metrics">
              <div>
                <dt>目前金額</dt>
                <dd>{{ formatPositionAmount(selectedUsdcPosition.amount, selectedUsdcPosition.asset) }}</dd>
              </div>
              <div>
                <dt>目前利率</dt>
                <dd>{{ formatPositionRate(selectedUsdcPosition.rate, selectedUsdcPosition.rateType) }}</dd>
              </div>
              <div>
                <dt>估計年收益</dt>
                <dd>{{ selectedUsdcAnnualYield === null ? '—' : formatAnnualUsd(selectedUsdcAnnualYield) }}</dd>
              </div>
            </dl>
          </article>

          <div class="usdc-candidate-head">
            <div>
              <h3>同口徑市場候選</h3>
              <p>{{ selectedUsdcPosition.chain }} · USDC · {{ selectedUsdcPosition.rateType ?? '利率口徑未知' }}</p>
            </div>
            <span>最多 3 個</span>
          </div>

          <div v-if="selectedUsdcPosition.rate === null || selectedUsdcPosition.rateType === null" class="usdc-comparison-state">
            此部位目前沒有可核對的利率，因此不產生跨產品比較。
          </div>
          <div v-else-if="usdcDecisionPending" class="usdc-comparison-state">
            正在整理相同鏈、資產與利率口徑的候選…
          </div>
          <div v-else-if="usdcDecisionError" class="usdc-comparison-state usdc-comparison-error">
            {{ usdcDecisionError }}
            <button type="button" @click="refreshUsdcDecision">重新嘗試</button>
          </div>
          <div v-else-if="!usdcDecision?.candidates.length" class="usdc-comparison-state">
            目前沒有找到利率高於此部位、且符合相同比較口徑的已驗證產品。
          </div>
          <div v-else class="usdc-candidate-list">
            <article
              v-for="candidate in usdcDecision.candidates"
              :key="`${candidate.protocol}:${candidate.product}:${candidate.sourcePoolId ?? ''}`"
              class="usdc-candidate-row"
            >
              <div>
                <p>{{ candidate.protocol }} · {{ opportunityTypeLabel(candidate.opportunityType) }}</p>
                <NuxtLink :to="productDetailPath({ protocol: candidate.protocol, product: candidate.product, chain: candidate.chain, asset: candidate.asset, sourcePoolId: candidate.sourcePoolId })">
                  {{ candidate.product }}
                </NuxtLink>
                <a v-if="candidate.productUrl" class="candidate-official-link" :href="candidate.productUrl" target="_blank" rel="noopener noreferrer">產品連結 ↗</a>
              </div>
              <dl>
                <div>
                  <dt>利率差</dt>
                  <dd>+{{ candidateRateDifference(candidate).toFixed(2) }}%</dd>
                </div>
                <div>
                  <dt>估計年化差額</dt>
                  <dd>+{{ formatAnnualUsd(candidateAnnualDifference(candidate)) }}</dd>
                </div>
              </dl>
            </article>
          </div>

          <p class="usdc-comparison-note">
            僅比較同鏈、同資產及相同 APR／APY 口徑；年收益與差額為依目前利率估算的事實摘要，不代表搬倉建議。
          </p>
        </div>
      </section>

      <section id="defi-market" class="section">
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
              :position-support-label="group.positionSupportLabel"
              :position-support-help="group.positionSupportHelp"
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

      <section id="chain-events" class="section">
        <div class="section-head">
          <h2>鏈上事件</h2>
          <p v-if="!isWalletConnected">連接後顯示與持倉相關的正式事件</p>
          <p v-else-if="eventProtocols.length && currentChainEventResponse">
            {{ coveredEventProtocols.length }}/{{ eventProtocols.length }} 個持倉協議已有正式事件來源
          </p>
          <p v-else-if="eventProtocols.length">正在確認 {{ eventProtocols.length }} 個持倉協議的事件來源</p>
          <p v-else>目前沒有可比對的已支援協議</p>
        </div>

        <div
          v-if="!isWalletConnected"
          class="event-state"
        >
          <strong>尚未連接錢包</strong>
          <p>連接後，我們才會依照公開地址中的協議部位查詢正式事件；不會要求交易或 Token 授權。</p>
        </div>

        <div
          v-else-if="chainEventsPending && !currentChainEventResponse"
          class="event-state"
          aria-live="polite"
        >
          <strong>正在核對持倉相關事件…</strong>
          <p>只查詢 {{ eventProtocols.join('、') }} 的官方治理或官方 repository。</p>
        </div>

        <div
          v-else-if="chainEventsError"
          class="event-state event-state-error"
        >
          <strong>事件資料暫時無法使用</strong>
          <p>{{ chainEventsError }}</p>
          <button type="button" @click="refreshChainEvents">重新查詢</button>
        </div>

        <div
          v-else-if="eventProtocols.length === 0"
          class="event-state"
        >
          <strong>目前沒有可比對的 DeFi 部位</strong>
          <p>因此這次沒有呼叫外部事件來源；找到協議部位後，這裡會自動確認正式來源覆蓋。</p>
        </div>

        <div
          v-else-if="chainEventProvidersUnavailable"
          class="event-state event-state-error"
        >
          <strong>{{ coveredEventProtocols.length === 0 ? '目前持倉協議尚無可用的正式事件來源' : '正式事件來源目前無法取得' }}</strong>
          <p>這不代表近期沒有事件；我們沒有用舊新聞或第三方內容補成結果。</p>
          <button type="button" @click="refreshChainEvents">重新查詢</button>
        </div>

        <div
          v-else-if="chainEvents.length === 0"
          class="event-state event-state-quiet"
        >
          <strong>近期沒有需要特別處理的正式事件</strong>
          <p>最近 45 天未找到與目前持倉範圍相符的重要安全、暫停、升級或治理事件。</p>
        </div>

        <ul v-else class="events">
          <li
            v-for="event in chainEvents"
            :key="event.id"
            class="event"
          >
            <span class="event-marker" :class="`event-marker-${eventTone(event.severity)}`" aria-hidden="true" />
            <div class="event-main">
              <p class="event-meta">
                <span class="event-type" :class="`event-type-${eventTone(event.severity)}`">{{ eventTypeLabel(event.type) }}</span>
                <time :datetime="event.occurredAt">{{ formatFetchedAt(event.occurredAt) }}</time>
              </p>
              <p class="event-title">{{ event.title }}</p>
              <p class="event-summary">{{ event.summary }}</p>
              <p class="event-protocol">{{ event.protocol }} · {{ eventScopeLabel(event) }}</p>
              <a
                class="event-source"
                :href="event.sourceUrl"
                target="_blank"
                rel="noopener noreferrer"
              >{{ event.verification === 'ONCHAIN_VERIFIED' ? '鏈上核對' : '官方來源' }} · {{ event.source }} ↗</a>
            </div>
            <span class="event-attention" :class="`event-attention-${eventTone(event.severity)}`">
              {{ eventSeverityLabel(event.severity) }}
            </span>
          </li>
        </ul>

        <p v-if="chainEventProviderFailed && !chainEventProvidersUnavailable" class="event-provider-note">
          部分正式來源暫時無法取得；目前只顯示已成功核對的事件。
        </p>
        <p v-if="uncoveredEventProtocols.length" class="event-provider-note">
          尚未覆蓋：{{ uncoveredEventProtocols.join('、') }}。缺少正式來源不代表沒有風險。
        </p>
        <p v-if="chainEventFetchedAt" class="event-fetched">
          查詢時間 {{ chainEventFetchedAt }} · 每 5 分鐘重新核對
        </p>
      </section>
    </main>

    <footer class="footer">
      <p>市場與事件資料皆標示來源與更新時間。</p>
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

.hero-watch {
  border-left: 3px solid var(--color-status-attention);
}

.hero-critical {
  border-left: 3px solid #c2413b;
}

.hero-neutral {
  border-left: 3px solid var(--color-border);
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
  width: 16px;
  height: 16px;
  flex: 0 0 16px;
  border: 2px solid var(--color-text-muted);
  border-radius: 50%;
  transform: translateY(-1px);
}

.hero-dot-healthy { border-color: var(--color-status-healthy); background: var(--color-status-healthy); }
.hero-dot-watch { border-color: var(--color-status-attention); background: var(--color-status-attention); }
.hero-dot-critical { border-color: #c2413b; background: #c2413b; }
.hero-dot-neutral { background: transparent; }

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

.evidence small {
  display: block;
  margin-top: -3px;
  color: var(--color-text-muted);
  font-size: .75rem;
  line-height: 1.5;
}

.hero-action {
  display: inline-flex;
  margin-top: 20px;
  padding: 9px 13px;
  border: 1px solid var(--color-border);
  border-radius: 9px;
  background: var(--color-surface-soft);
  color: var(--color-text-primary);
  font-size: .8125rem;
  font-weight: 600;
  text-decoration: none;
}

.hero-action:hover { border-color: #168f87; color: #168f87; }
.section { scroll-margin-top: 92px; }

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
.inline-retry {
  margin-top: 12px;
  padding: 7px 12px;
  border: 1px solid var(--color-border);
  border-radius: 9px;
  background: var(--color-surface-soft);
  color: var(--color-text-primary);
  cursor: pointer;
  font: inherit;
  font-size: .8125rem;
}
.inline-retry:hover { border-color: var(--color-text-muted); }

.position-list {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.portfolio-position-block { margin-top: 24px; }

.position-list-head {
  display: flex;
  gap: 16px;
  align-items: flex-end;
  justify-content: space-between;
}

.position-list-head h3 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 1rem;
}

.position-list-head p {
  margin: 5px 0 0;
  color: var(--color-text-muted);
  font-size: .75rem;
}

.position-list-head > span {
  flex: 0 0 auto;
  color: var(--color-text-muted);
  font-size: .75rem;
}

.position-card {
  display: flex;
  gap: 20px;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
}

.position-card strong { color: var(--color-text-primary); }
.position-card small { display: block; margin-top: 5px; color: var(--color-text-muted); font-size: .75rem; }
.position-detail-link { display: inline-flex; margin-top: 9px; color: #168f87; font-size: .75rem; font-weight: 650; text-decoration: none; }
.position-detail-link:hover { text-decoration: underline; text-underline-offset: 3px; }
.position-meta { margin: 0 0 5px; color: #168f87; font-size: .75rem; }
.position-values { flex-shrink: 0; text-align: right; }
.position-values span { display: block; margin-top: 5px; color: var(--color-text-muted); font-size: .75rem; }
.usdc-position-list { margin-top: 20px; }
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

.usdc-comparison { margin-top: 18px; }

.usdc-position-picker {
  display: flex;
  gap: 20px;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
}

.usdc-position-picker label { display: flex; flex-direction: column; gap: 4px; color: var(--color-text-primary); font-size: .8125rem; }
.usdc-position-picker label small { color: var(--color-text-muted); font-size: .75rem; }
.usdc-position-picker select { min-width: min(390px, 62%); padding: 9px 34px 9px 11px; border: 1px solid var(--color-border); border-radius: 9px; background: var(--color-surface-soft); color: var(--color-text-primary); cursor: pointer; font: inherit; font-size: .8125rem; }

.usdc-current-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 28px;
  align-items: center;
  margin-top: 12px;
  padding: 20px;
  border: 1px solid color-mix(in srgb, #168f87 42%, var(--color-border));
  border-radius: 14px;
  background: color-mix(in srgb, #168f87 5%, var(--color-surface));
}

.usdc-current-identity p { margin: 0 0 7px; color: #168f87; font-size: .75rem; }
.usdc-current-identity strong { display: block; color: var(--color-text-primary); font-size: 1rem; }
.usdc-current-identity small { display: block; margin-top: 6px; color: var(--color-text-muted); font-size: .75rem; }
.usdc-current-metrics { display: grid; grid-template-columns: repeat(3, auto); gap: 28px; margin: 0; }
.usdc-current-metrics dt, .usdc-candidate-row dt { color: var(--color-text-muted); font-size: .6875rem; }
.usdc-current-metrics dd { margin: 6px 0 0; white-space: nowrap; color: var(--color-text-primary); font-size: .9375rem; font-weight: 650; }

.usdc-candidate-head { display: flex; gap: 16px; align-items: flex-end; justify-content: space-between; margin-top: 22px; }
.usdc-candidate-head h3 { margin: 0; color: var(--color-text-primary); font-size: .9375rem; }
.usdc-candidate-head p { margin: 5px 0 0; color: var(--color-text-muted); font-size: .75rem; }
.usdc-candidate-head > span { color: var(--color-text-muted); font-size: .75rem; }
.usdc-candidate-list { margin-top: 10px; border: 1px solid var(--color-border); border-radius: 14px; background: var(--color-surface); overflow: hidden; }
.usdc-candidate-row { display: flex; gap: 20px; align-items: center; justify-content: space-between; padding: 16px 18px; }
.usdc-candidate-row + .usdc-candidate-row { border-top: 1px solid var(--color-border-subtle); }
.usdc-candidate-row p { margin: 0 0 5px; color: var(--color-text-muted); font-size: .75rem; }
.usdc-candidate-row a, .usdc-candidate-row strong { color: var(--color-text-primary); font-size: .875rem; font-weight: 600; text-decoration: none; }
.usdc-candidate-row a:hover { text-decoration: underline; text-underline-offset: 3px; }
.usdc-candidate-row .candidate-official-link { display: inline-flex; margin-left: 10px; color: var(--color-text-muted); font-size: .75rem; font-weight: 500; }
.usdc-candidate-row dl { display: grid; grid-template-columns: repeat(2, minmax(100px, auto)); gap: 22px; margin: 0; text-align: right; }
.usdc-candidate-row dd { margin: 5px 0 0; white-space: nowrap; color: #168f87; font-size: .875rem; font-weight: 650; }
.usdc-comparison-state { margin-top: 10px; padding: 16px 18px; border: 1px dashed var(--color-border); border-radius: 12px; color: var(--color-text-muted); font-size: .8125rem; line-height: 1.55; }
.usdc-comparison-error { color: var(--color-text-body); }
.usdc-comparison-error button { margin-left: 8px; padding: 4px 8px; border: 1px solid var(--color-border); border-radius: 7px; background: var(--color-surface); color: var(--color-text-primary); cursor: pointer; font: inherit; }
.usdc-comparison-note { margin: 12px 2px 0; color: var(--color-text-muted); font-size: .75rem; line-height: 1.55; }

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

.event-marker-critical { background: #c2413b; }
.event-marker-watch { background: #b7791f; }
.event-marker-info { background: #168f87; }

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

.event-type-critical { color: #c2413b; }
.event-type-watch { color: #a56813; }
.event-type-info { color: #168f87; }

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

.event-summary {
  max-width: 680px;
  margin: 7px 0 0;
  color: var(--color-text-body);
  font-size: .8125rem;
  line-height: 1.6;
}

.event-source {
  display: inline-block;
  margin-top: 8px;
  color: var(--color-text-secondary);
  font-size: .75rem;
  text-decoration: none;
}

.event-source:hover { color: #168f87; text-decoration: underline; text-underline-offset: 3px; }

.event-attention {
  flex-shrink: 0;
  margin-top: 2px;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.event-attention-critical { color: #c2413b; }
.event-attention-watch { color: #a56813; }
.event-attention-info { color: #168f87; }

.event-state {
  margin-top: 20px;
  padding: 20px 22px;
  border: 1px dashed var(--color-border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--color-surface) 55%, transparent);
}

.event-state strong { color: var(--color-text-primary); font-size: .9375rem; }
.event-state p { margin: 7px 0 0; color: var(--color-text-muted); font-size: .8125rem; line-height: 1.6; }
.event-state button { margin-top: 12px; padding: 7px 11px; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-surface); color: var(--color-text-primary); cursor: pointer; font: inherit; font-size: .8125rem; }
.event-state-quiet { border-color: color-mix(in srgb, #168f87 35%, var(--color-border)); }
.event-state-error { border-color: color-mix(in srgb, #c2413b 35%, var(--color-border)); }
.event-provider-note, .event-fetched { margin: 10px 0 0; color: var(--color-text-muted); font-size: .75rem; }
.event-provider-note { color: #a56813; }

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
  .position-card { align-items: flex-start; flex-direction: column; gap: 12px; }
  .position-values { text-align: left; }
  .usdc-position-picker { align-items: stretch; flex-direction: column; gap: 10px; }
  .usdc-position-picker select { width: 100%; min-width: 0; }
  .usdc-current-card { grid-template-columns: 1fr; }
  .usdc-current-metrics { grid-template-columns: repeat(3, 1fr); gap: 14px; }
  .usdc-candidate-row { align-items: flex-start; flex-direction: column; }
  .usdc-candidate-row dl { width: 100%; text-align: left; }
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

}

@media (max-width: 480px) {
  .market-section-head {
    align-items: flex-start;
  }

  .grid-4 {
    grid-template-columns: 1fr;
  }

  .usdc-current-metrics { grid-template-columns: 1fr; }
  .usdc-candidate-row dl { grid-template-columns: 1fr; gap: 12px; }
}
</style>
