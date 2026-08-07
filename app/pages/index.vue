<script setup lang="ts">
type DecisionLevel = 'healthy' | 'attention'
type RiskLevel = 'Low' | 'Medium'

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

interface UsdcPosition {
  asset: string
  protocol: string
  apr: number
  amount: number
  risk: RiskLevel
}

interface UsdcOpportunity {
  protocol: string
  apr: number
  tvl: string
  risk: RiskLevel
  isCurrent?: boolean
}

interface OpportunityView {
  protocol: string
  aprLabel: string
  tvlLabel: string
  riskLabel: string
  isCurrent: boolean
  aprDiffLabel: string
  annualDiffLabel: string | null
  aprDiff: number
}

interface Dashboard {
  greeting: string
  date: string
  portfolio: SummaryItem[]
  events: ChainEvent[]
  updatedAt: string
}

interface HeroView {
  level: DecisionLevel
  question: string
  headline: string
  statement: string
  evidence: string[]
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

const usdcPosition: UsdcPosition = {
  asset: 'USDC',
  protocol: 'Spark',
  apr: 4.35,
  amount: 40000,
  risk: 'Low'
}

/**
 * Temporary personal-comparison mock only.
 * Not sourced from the Market Dashboard API.
 */
const usdcOpportunities: UsdcOpportunity[] = [
  { protocol: 'Spark', apr: 4.35, tvl: '$4.8B', risk: 'Low', isCurrent: true },
  { protocol: 'Aave', apr: 4.12, tvl: '$18.2B', risk: 'Low' },
  { protocol: 'Morpho', apr: 4.92, tvl: '$3.6B', risk: 'Medium' },
  { protocol: 'Fluid', apr: 5.14, tvl: '$1.9B', risk: 'Medium' }
]

function formatApr (apr: number): string {
  return `${apr.toFixed(2)}%`
}

function formatAprDiff (diff: number, isCurrent: boolean): string {
  if (isCurrent) {
    return '目前部位'
  }
  const sign = diff > 0 ? '+' : ''
  return `${sign}${diff.toFixed(2)}% vs 目前`
}

function formatAnnualDiff (amount: number, aprDiff: number, isCurrent: boolean): string | null {
  if (isCurrent || aprDiff === 0) {
    return null
  }
  const yearly = Math.round(amount * (aprDiff / 100))
  const sign = yearly > 0 ? '+' : ''
  return `約 ${sign}${yearly.toLocaleString('en-US')} USDC / 年`
}

const opportunityRows: OpportunityView[] = usdcOpportunities.map((item) => {
  const isCurrent = item.isCurrent === true
  const aprDiff = Number((item.apr - usdcPosition.apr).toFixed(2))

  return {
    protocol: item.protocol,
    aprLabel: formatApr(item.apr),
    tvlLabel: item.tvl,
    riskLabel: `${item.risk} 風險`,
    isCurrent,
    aprDiffLabel: formatAprDiff(aprDiff, isCurrent),
    annualDiffLabel: formatAnnualDiff(usdcPosition.amount, aprDiff, isCurrent),
    aprDiff
  }
})

function getOpportunityRow (protocol: string): OpportunityView {
  const row = opportunityRows.find(item => item.protocol === protocol)
  if (!row) {
    throw new Error(`Missing opportunity row: ${protocol}`)
  }
  return row
}

function formatSignedAprDiff (diff: number): string {
  const sign = diff > 0 ? '+' : ''
  return `${sign}${diff.toFixed(2)}%`
}

function annualYieldUsdc (aprDiff: number): number {
  return Math.round(usdcPosition.amount * (aprDiff / 100))
}

const morphoRow = getOpportunityRow('Morpho')
const fluidRow = getOpportunityRow('Fluid')
const morphoAnnualUsdc = annualYieldUsdc(morphoRow.aprDiff)
const fluidAnnualUsdc = annualYieldUsdc(fluidRow.aprDiff)
const annualYieldLow = Math.min(morphoAnnualUsdc, fluidAnnualUsdc)
const annualYieldHigh = Math.max(morphoAnnualUsdc, fluidAnnualUsdc)

const morphoOpportunity = usdcOpportunities.find(item => item.protocol === 'Morpho')
const fluidOpportunity = usdcOpportunities.find(item => item.protocol === 'Fluid')

if (!morphoOpportunity || !fluidOpportunity) {
  throw new Error('Missing Morpho or Fluid opportunity source data')
}

const higherYieldRiskLabel = morphoOpportunity.risk === fluidOpportunity.risk
  ? `${morphoOpportunity.risk} Risk`
  : `${morphoOpportunity.risk} / ${fluidOpportunity.risk} Risk`

// Mock conclusion for this task — not a Decision Engine rule.
const decisionConclusion = '目前不需要調整。'

const hero: HeroView = {
  level: 'healthy',
  question: '今天需要做什麼？',
  headline: `目前不需要調整 ${usdcPosition.asset} 配置`,
  statement: `${usdcPosition.protocol} 目前 APR ${formatApr(usdcPosition.apr)}，市場上雖有更高收益選項，但差距暫時不足以支持搬倉。`,
  evidence: [
    `目前 ${usdcPosition.amount.toLocaleString('en-US')} ${usdcPosition.asset} 位於 ${usdcPosition.protocol}`,
    `Morpho 約高 ${formatSignedAprDiff(morphoRow.aprDiff)}，Fluid 約高 ${formatSignedAprDiff(fluidRow.aprDiff)}`,
    `較高收益選項目前為 ${higherYieldRiskLabel}`
  ]
}

const moveDecision = {
  question: '值得搬嗎？',
  answer: decisionConclusion,
  reasons: [
    `Morpho 只比目前部位高 ${formatSignedAprDiff(morphoRow.aprDiff)} APR`,
    `Fluid 比目前部位高 ${formatSignedAprDiff(fluidRow.aprDiff)} APR`,
    `較高收益的選項目前協議風險也較高（${morphoOpportunity.risk}）`,
    `以 ${usdcPosition.amount.toLocaleString('en-US')} USDC 估算，額外年化收益約 ${annualYieldLow.toLocaleString('en-US')}–${annualYieldHigh.toLocaleString('en-US')} USDC，尚不足以支持現在搬倉`
  ],
  estimateNote: '上述金額為依目前 APR 差距推估的年化差額，不是保證收益。',
  disclaimer: '此比較僅依示意資料說明差異，不構成投資建議。'
}

const isHealthy = hero.level === 'healthy'

const { toggleLabel, toggleTheme } = useTheme()

const {
  data: marketDashboard,
  pending: marketPending,
  error: marketError
} = await useFetch<UsdcMarketDashboardResponse>('/api/market/usdc/dashboard')

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
          <p>比較目前 USDC 部位與示意市場選項（暫為示意資料）</p>
        </div>

        <div class="current-position">
          <p class="current-label">目前部位</p>
          <p class="current-value">
            {{ usdcPosition.amount.toLocaleString('en-US') }} {{ usdcPosition.asset }}
            · {{ usdcPosition.protocol }}
            · APR {{ formatApr(usdcPosition.apr) }}
            · {{ usdcPosition.risk }} 風險
          </p>
        </div>

        <ul class="opportunities">
          <OpportunityRow
            v-for="row in opportunityRows"
            :key="row.protocol"
            :protocol="row.protocol"
            :apr-label="row.aprLabel"
            :tvl-label="row.tvlLabel"
            :risk-label="row.riskLabel"
            :is-current="row.isCurrent"
            :apr-diff-label="row.aprDiffLabel"
            :annual-diff-label="row.annualDiffLabel"
          />
        </ul>

        <div class="move-decision">
          <p class="move-question">{{ moveDecision.question }}</p>
          <p class="move-answer">{{ moveDecision.answer }}</p>
          <ul class="move-reasons">
            <li
              v-for="reason in moveDecision.reasons"
              :key="reason"
            >
              {{ reason }}
            </li>
          </ul>
          <p class="move-note">{{ moveDecision.estimateNote }}</p>
          <p class="move-disclaimer">{{ moveDecision.disclaimer }}</p>
        </div>
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
