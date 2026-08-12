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
  opportunityType: OpportunityType
  asset: string
  chain: string
  rate: number
  rateType: RateType
  tvlUsd: number | null
  source: string
  sourceUrl?: string
  sourcePoolId?: string
  dataQuality: string
  fetchedAt: string
}

interface YieldResponseMeta {
  fetchedAt: string
  status: FreshnessStatus
  providers: ProviderFetchMeta[]
}

interface UsdcMarketDashboardResponse {
  data: YieldOpportunity[]
  meta: YieldResponseMeta
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
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(ms))
}

const { toggleLabel, toggleTheme } = useTheme()

const {
  data: marketDashboard,
  pending: marketPending,
  error: marketError
} = await useFetch<UsdcMarketDashboardResponse>('/api/market/usdc/dashboard')

const {
  data: decisionPayload,
  pending: decisionPending,
  error: decisionError
} = await useFetch<UsdcDecisionCandidateResponse>('/api/decision/usdc')

const marketRows = computed(() => {
  const payload = marketDashboard.value
  if (!payload) {
    return []
  }

  return payload.data.map(opportunity => ({
    key: `${opportunity.protocol}:${opportunity.product}:${opportunity.sourcePoolId ?? ''}`,
    protocol: opportunity.protocol,
    product: opportunity.product,
    typeLabel: opportunityTypeLabel(opportunity.opportunityType),
    chain: opportunity.chain,
    rateLabel: formatMarketRate(opportunity.rate, opportunity.rateType),
    tvlLabel: formatCompactUsd(opportunity.tvlUsd)
  }))
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
        metaLabel: `${opportunityTypeLabel(candidate.opportunityType)} · ${candidate.chain}`,
        isCurrent: false,
        aprDiffLabel: `${formatSignedRateDiff(rateDiff)} vs 目前`,
        annualDiffLabel: formatAnnualDiff(position.amount, rateDiff)
      }
    })
})

/**
 * Highest observed rate among candidates comparable to the current position rateType only.
 */
const highestComparableCandidate = computed(() => {
  const comparable = rateComparableCandidates.value
  if (comparable.length === 0) {
    return null
  }

  return comparable.reduce((best, candidate) => {
    if (candidate.rate > best.rate) {
      return candidate
    }
    return best
  })
})

const hero = computed(() => {
  const position = displayPosition.value
  const rate = currentPositionRate.value
  const higherCount = higherYieldCandidates.value.length
  const highest = highestComparableCandidate.value
  // Neutral observational state only — higher yield does not imply attention.
  const level: DecisionLevel = 'healthy'

  if (!rate) {
    return {
      level,
      question: '今天有什麼可觀察的差異？',
      headline: `目前部位：${position.protocol} ${position.product}`,
      statement: '已取得候選資料，但暫時無法對應目前部位的市場觀察利率，因此尚不能計算與市場的差距。',
      evidence: [
        `目前 ${position.amount.toLocaleString('en-US')} ${position.asset}（示意部位，非錢包讀取）`,
        `候選機會 ${decisionCandidates.value.length} 筆`,
        '部位利率需待 Portfolio 或市場對應完成後才能比較'
      ]
    }
  }

  const evidence = [
    `目前 ${position.amount.toLocaleString('en-US')} ${position.asset} 位於 ${position.protocol} · ${position.product}（示意部位）`,
    `目前部位市場觀察利率 ${formatMarketRate(rate.rate, rate.rateType)}`,
    `可直接比較（同 ${rate.rateType}）且高於目前部位的候選：${higherCount} 個`
  ]

  if (highest) {
    evidence.push(
      `同 ${rate.rateType} 候選中最高觀察利率：${highest.protocol} ${highest.product} ${formatMarketRate(highest.rate, highest.rateType)}`
    )
  }

  if (higherCount > 0) {
    const top = higherYieldCandidates.value[0]
    if (top) {
      const diff = Number((top.rate - rate.rate).toFixed(2))
      evidence.push(
        `同單位下差距最大的較高收益候選：${top.protocol} ${top.product} ${formatSignedRateDiff(diff)} vs 目前`
      )
    }
  }

  return {
    level,
    question: '今天有什麼可觀察的差異？',
    headline: higherCount > 0
      ? `目前觀察到 ${higherCount} 個同單位下高於你目前部位的 USDC 選項`
      : `目前未觀察到同單位下高於 ${position.protocol} 部位的 USDC 選項`,
    statement: higherCount > 0
      ? '以下為事實比較，不是搬倉建議。完整 Decision Engine 尚未上線。'
      : `以目前示意部位與可比較候選對照，尚未看到高於 ${formatMarketRate(rate.rate, rate.rateType)} 的選項。`,
    evidence
  }
})

const observationSummary = computed(() => {
  const position = displayPosition.value
  const rate = currentPositionRate.value
  const higherCount = higherYieldCandidates.value.length
  const highest = highestComparableCandidate.value
  const reasons: string[] = []

  if (!rate) {
    return {
      question: '市場差異觀察',
      answer: '目前無法計算與部位的利率差距',
      reasons: [
        'Decision API 已回傳候選，但目前部位缺少對應的市場觀察利率',
        `候選機會共 ${decisionCandidates.value.length} 筆`
      ],
      estimateNote: '年化差額需在部位利率可用後才能估算。',
      disclaimer: '此區塊僅呈現事實觀察，不構成投資建議，也不是搬倉指令。'
    }
  }

  if (highest) {
    reasons.push(
      `同 ${rate.rateType} 候選最高觀察利率：${highest.protocol} ${highest.product} ${formatMarketRate(highest.rate, highest.rateType)}`
    )
  }

  reasons.push(
    `同 ${rate.rateType} 且高於目前部位的候選：${higherCount} 個（全部候選 ${decisionCandidates.value.length} 個；不同 rateType 不直接比較）`
  )

  for (const row of personalComparisonRows.value.slice(0, 3)) {
    reasons.push(`${row.protocol} ${row.product} ${row.aprDiffLabel}`)
  }

  if (higherCount > PERSONAL_HIGHER_YIELD_DISPLAY_LIMIT) {
    reasons.push(
      `列表僅顯示較高收益候選前 ${PERSONAL_HIGHER_YIELD_DISPLAY_LIMIT} 筆，供快速觀察`
    )
  }

  return {
    question: '市場差異觀察',
    answer: higherCount > 0
      ? `目前有 ${higherCount} 個同單位下高於目前部位的候選`
      : '目前沒有同單位下高於目前部位的候選',
    reasons,
    estimateNote: `年化差額依示意部位 ${position.amount.toLocaleString('en-US')} USDC 與同單位利率差估算，不是保證收益。`,
    disclaimer: '此比較僅呈現事實差異，不構成投資建議，亦不代表系統已做出搬倉推薦。'
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
          <p class="hero-question">今天有什麼可觀察的差異？</p>
          <h1 class="hero-headline">正在取得個人 USDC 比較資料…</h1>
          <p class="hero-statement">
            正在載入 Decision Candidate 資料，請稍候。
          </p>
        </template>

        <template v-else-if="decisionError">
          <p class="hero-question">今天有什麼可觀察的差異？</p>
          <h1 class="hero-headline">
            <span class="hero-dot">🟡</span>
            目前無法取得個人 USDC 比較資料
          </h1>
          <p class="hero-statement">
            Decision Candidate API 暫時無法使用。下方市場區塊仍可能獨立可用。
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
          <p>我的資金分布在哪裡</p>
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
          <h2>USDC 市場</h2>
          <p>快速了解目前有代表性的 USDC 收益市場</p>
        </div>

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

          <ul class="market-list">
            <MarketOpportunityRow
              v-for="row in marketRows"
              :key="row.key"
              :protocol="row.protocol"
              :product="row.product"
              :type-label="row.typeLabel"
              :chain="row.chain"
              :rate-label="row.rateLabel"
              :tvl-label="row.tvlLabel"
            />
          </ul>

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
          <h2>你的 USDC</h2>
          <p>以示意目前部位，對照真實 Decision Candidate 資料</p>
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
          正在取得 Decision Candidate 資料…
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

          <div class="move-decision">
            <p class="move-question">{{ observationSummary.question }}</p>
            <p class="move-answer">{{ observationSummary.answer }}</p>
            <ul class="move-reasons">
              <li
                v-for="reason in observationSummary.reasons"
                :key="reason"
              >
                {{ reason }}
              </li>
            </ul>
            <p class="move-note">{{ observationSummary.estimateNote }}</p>
            <p class="move-disclaimer">{{ observationSummary.disclaimer }}</p>
          </div>
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

.move-decision {
  margin-top: 16px;
  padding: 24px 22px;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-surface);
}

.move-question {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.move-answer {
  margin: 10px 0 0;
  font-size: 1.375rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--color-text-primary);
}

.move-reasons {
  margin: 18px 0 0;
  padding: 0;
  list-style: none;
}

.move-reasons li {
  position: relative;
  padding-left: 16px;
  font-size: 0.9375rem;
  line-height: 1.8;
  color: var(--color-text-body);
}

.move-reasons li::before {
  position: absolute;
  left: 0;
  color: var(--color-bullet);
  content: '·';
}

.move-note,
.move-disclaimer {
  margin: 14px 0 0;
  font-size: 0.8125rem;
  line-height: 1.6;
  color: var(--color-text-muted);
}

.move-disclaimer {
  margin-top: 8px;
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
  .grid-4 {
    grid-template-columns: 1fr;
  }
}
</style>
