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
      scope: 'SUPPORTED_ETHEREUM_USDC_PROTOCOLS'
      sort: 'tvl'
      limit: number
      protocolCount: number
      totalEligibleProtocols: number
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

function opportunityDisplayTypeLabel (opportunity: YieldOpportunity): string {
  const base = opportunityTypeLabel(opportunity.opportunityType)
  return opportunity.productVersion ? `${base} ${opportunity.productVersion}` : base
}

const { toggleLabel, toggleTheme } = useTheme()

const {
  data: marketDashboard,
  pending: marketPending,
  error: marketError
} = await useFetch<UsdcMarketDashboardResponse>(
  `/api/market/usdc/dashboard?limit=${MARKET_INITIAL_PROTOCOL_LIMIT}&sort=tvl&chain=ethereum&asset=usdc`
)

const showAllMarketProtocols = ref(false)
const marketRefreshing = ref(false)
const marketRefreshMessage = ref<string | null>(null)

async function refreshMarket (): Promise<void> {
  marketRefreshing.value = true
  marketRefreshMessage.value = null

  try {
    const refreshed = await $fetch<UsdcMarketDashboardResponse>(
      `/api/market/usdc/dashboard?limit=${showAllMarketProtocols.value ? 20 : MARKET_INITIAL_PROTOCOL_LIMIT}&sort=tvl&chain=ethereum&asset=usdc&refresh=1`
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

async function toggleMarketProtocols (): Promise<void> {
  if (showAllMarketProtocols.value) {
    showAllMarketProtocols.value = false
    const ranked = await $fetch<UsdcMarketDashboardResponse>(
      `/api/market/usdc/dashboard?limit=${MARKET_INITIAL_PROTOCOL_LIMIT}&sort=tvl&chain=ethereum&asset=usdc`
    )
    marketDashboard.value = ranked
    return
  }

  const ranked = await $fetch<UsdcMarketDashboardResponse>(
    '/api/market/usdc/dashboard?limit=20&sort=tvl&chain=ethereum&asset=usdc'
  )
  marketDashboard.value = ranked
  showAllMarketProtocols.value = true
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
      product: string
      typeLabel: string
      chain: string
      rateLabel: string
      tvlLabel: string
      productUrl?: string
    }>
  }>()

  for (const opportunity of payload.data) {
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
      product: opportunity.product,
      typeLabel: opportunityDisplayTypeLabel(opportunity),
      chain: opportunity.chain,
      rateLabel: formatMarketRate(opportunity.rate, opportunity.rateType),
      tvlLabel: formatCompactUsd(opportunity.tvlUsd),
      productUrl: opportunity.productUrl
    })
    groups.set(opportunity.protocol, group)
  }

  return Array.from(groups.values())
    .sort((left, right) => right.totalTvlUsd - left.totalTvlUsd)
    .map(group => ({
      ...group,
      tvlLabel: formatCompactUsd(group.totalTvlUsd),
      sourceLabel: group.sourceKinds.size === 1
        ? group.sourceKinds.has('OFFICIAL_API')
          ? '官方資料'
          : group.sourceKinds.has('ONCHAIN')
            ? '鏈上資料'
            : '第三方資料'
        : '混合資料'
    }))
})

const visibleMarketGroups = computed(() => marketGroups.value)

const hasMoreMarketProtocols = computed(() => {
  const ranking = marketDashboard.value?.meta.ranking
  return showAllMarketProtocols.value
    || Boolean(ranking && ranking.totalEligibleProtocols > ranking.protocolCount)
})

const marketRankingLabel = computed(() => {
  const ranking = marketDashboard.value?.meta.ranking
  if (!ranking) {
    return 'DeFi OS 已支援的 Ethereum USDC 協議，依 TVL 合計排序'
  }

  return `DeFi OS 已支援的 Ethereum USDC 協議 · TVL 前 ${ranking.limit}（目前符合 ${ranking.totalEligibleProtocols} 個）`
})

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
            <span class="hero-dot">{{ isHealthy ? '🟢' : '🟡' }}</span>
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

      <section class="section">
        <div class="section-head">
          <h2>投資組合</h2>
          <p>我的資產現在在哪裡？</p>
        </div>
        <div class="grid grid-4">
          <SummaryCard
            v-for="item in dashboard.portfolio"
            :key="item.label"
            :label="item.label"
            :value="item.value"
            :note="item.note"
          />
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <h2>你的 USDC</h2>
          <p>我的目前部位跟市場差多少？</p>
        </div>

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
      </section>

      <section class="section">
        <div class="section-head market-section-head">
          <div>
            <h2>DeFi 市場</h2>
            <p>Ethereum · USDC</p>
          </div>
          <button
            type="button"
            class="market-refresh"
            :disabled="marketRefreshing"
            @click="refreshMarket"
          >
            {{ marketRefreshing ? '更新中…' : '重新整理' }}
          </button>
        </div>

        <div class="market-filters" aria-label="目前市場資料範圍">
          <span class="market-filter"><span>鏈</span>Ethereum</span>
          <span class="market-filter"><span>資產</span>USDC</span>
          <span class="market-filter"><span>排序</span>TVL</span>
        </div>

        <p class="market-scope">
          {{ marketRankingLabel }}
        </p>

        <p
          v-if="marketPending"
          class="market-status"
        >
          正在取得 USDC 市場資料…
        </p>

        <p
          v-else-if="marketError"
          class="market-status market-status-error"
        >
          目前無法取得 USDC 市場資料。
        </p>

        <template v-else>
          <p
            v-if="hasPartialProviderFailure"
            class="market-notice"
          >
            部分市場資料來源暫時無法更新。
          </p>

          <p
            v-if="marketDashboard?.meta.cacheFallback"
            class="market-notice"
          >
            上游暫時無法更新，目前顯示最近一次成功資料。
          </p>

          <div class="market-list">
            <MarketProtocolGroup
              v-for="group in visibleMarketGroups"
              :key="group.protocol"
              :protocol="group.protocol"
              :rows="group.rows"
              :tvl-label="group.tvlLabel"
              :source-label="group.sourceLabel"
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
            <div class="event-main">
              <p class="event-meta">
                <span class="event-type">{{ event.type }}</span>
                <span>{{ event.protocol }}</span>
                <span>{{ event.time }}</span>
              </p>
              <p class="event-title">{{ event.title }}</p>
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
  padding: 40px 24px 64px;
}

.header {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
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
  margin-top: 56px;
}

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

.market-scope {
  margin: 14px 0 0;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
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
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-surface);
  list-style: none;
}

.event {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px;
  border-top: 1px solid var(--color-border-subtle);
}

.event:first-child {
  border-top: none;
}

.event-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 0;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.event-type {
  color: var(--color-text-body);
}

.event-title {
  margin: 8px 0 0;
  font-size: 0.9375rem;
  color: var(--color-text-primary);
}

.event-attention {
  flex-shrink: 0;
  padding: 5px 12px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
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

@media (max-width: 760px) {
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
