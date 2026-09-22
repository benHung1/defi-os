<script setup lang="ts">
import type { ChainEventRecord, ChainEventResponse } from '../../../shared/types/chainEvents'
import { decodeProductDetailId } from '../../utils/productDetail'

type RateType = 'APR' | 'APY'
type DataSourceKind = 'OFFICIAL_API' | 'ONCHAIN' | 'THIRD_PARTY_AGGREGATOR'

interface ProductOpportunity {
  protocol: string
  product: string
  productVersion?: string
  opportunityType: 'LENDING_SUPPLY' | 'SAVINGS' | 'CURATED_VAULT'
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
  fetchedAt: string
}

interface ProductDetailResponse {
  data: ProductOpportunity | null
  meta: {
    status: 'fresh' | 'stale' | 'unavailable'
    cacheFallback?: boolean
  }
}

const route = useRoute()
const reference = decodeProductDetailId(String(route.params.id ?? ''))
if (!reference) throw createError({ statusCode: 404, statusMessage: '找不到產品' })
useHead(() => ({ title: `${reference.product} · ${reference.protocol} | DeFi OS` }))

const { toggleLabel, toggleTheme } = useTheme()
const { isConnected } = useWalletSession()
const { portfolio, pending: portfolioPending, error: portfolioError } = usePortfolio()

const {
  data: productResponse,
  pending: productPending,
  error: productError,
  refresh: refreshProduct
} = await useFetch<ProductDetailResponse>('/api/products/detail', {
  query: {
    protocol: reference.protocol,
    product: reference.product,
    chain: reference.chain,
    asset: reference.asset,
    sourcePoolId: reference.sourcePoolId
  }
})

const eventProtocols = new Set(['Aave', 'Morpho Blue', 'Spark', 'Compound', 'Fluid'])
const supportsEvents = eventProtocols.has(reference.protocol)
const { data: eventResponse, pending: eventsPending, error: eventsError } = await useFetch<ChainEventResponse>('/api/events', {
  query: { protocols: reference.protocol, chains: reference.chain, assets: reference.asset, limit: 5 },
  immediate: supportsEvents
})

const product = computed(() => productResponse.value?.data ?? null)
const relatedPositions = computed(() => portfolio.value?.positions.filter(position =>
  position.protocol.toLowerCase() === reference.protocol.toLowerCase()
  && position.chain.toLowerCase() === reference.chain.toLowerCase()
  && position.asset.toUpperCase() === reference.asset
) ?? [])
const productEvents = computed<ChainEventRecord[]>(() => eventResponse.value?.data ?? [])

function formatUsd (value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '資料暫缺'
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2
  }).format(value)
}

function formatFullUsd (value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '美元價值暫缺'
  return `US$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}

function formatTime (value: string): string {
  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) return value
  const parts = new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    hour12: false, timeZone: 'Asia/Taipei'
  }).formatToParts(new Date(timestamp))
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${values.year}/${values.month}/${values.day} ${values.hour}:${values.minute}`
}

function sourceLabel (kind: DataSourceKind): string {
  if (kind === 'OFFICIAL_API') return '官方 API'
  if (kind === 'ONCHAIN') return '鏈上合約'
  return '第三方聚合資料'
}

function opportunityLabel (type: ProductOpportunity['opportunityType']): string {
  if (type === 'LENDING_SUPPLY') return 'Lending'
  if (type === 'SAVINGS') return 'Savings'
  return 'Vault'
}

function eventTypeLabel (event: ChainEventRecord): string {
  return ({ SECURITY: '安全事件', PAUSE: '合約狀態', UPGRADE: '協議升級', GOVERNANCE: '治理變化' })[event.type]
}

function positionKindLabel (kind: string): string {
  return ({ SUPPLY: '供應', BORROW: '借款', COLLATERAL: '抵押', VAULT: 'Vault' })[kind] ?? kind
}
</script>

<template>
  <div class="page">
    <header class="header">
      <div class="header-inner">
        <NuxtLink to="/" class="brand" aria-label="回到 DeFi OS 首頁">
          <span class="mark">D</span>
          <span>DeFi OS</span>
        </NuxtLink>
        <div class="header-actions">
          <button type="button" class="theme-toggle" :aria-label="toggleLabel" @click="toggleTheme">
            {{ toggleLabel }}
          </button>
          <WalletReadOnlyConnect />
        </div>
      </div>
    </header>

    <main class="content">
      <NuxtLink to="/#defi-market" class="back-link">← 回到 DeFi 市場</NuxtLink>

      <section class="product-hero">
        <div>
          <p class="eyebrow">{{ reference.protocol }} · {{ reference.chain }}</p>
          <h1>{{ product?.product ?? reference.product }}</h1>
          <p>{{ reference.asset }} 收益產品的目前狀態、你的相關部位與可追溯證據。</p>
        </div>
        <div class="hero-tags">
          <span>{{ reference.asset }}</span>
          <span v-if="product">{{ opportunityLabel(product.opportunityType) }}{{ product.productVersion ? ` ${product.productVersion}` : '' }}</span>
          <span v-if="product" :class="`source-${product.sourceKind.toLowerCase()}`">{{ sourceLabel(product.sourceKind) }}</span>
        </div>
      </section>

      <section v-if="productPending" class="state-card" aria-live="polite">
        <strong>正在核對產品資料…</strong>
        <p>目前利率、TVL 與來源確認完成後才會顯示。</p>
      </section>

      <section v-else-if="productError || !product" class="state-card error">
        <strong>此部位目前沒有可對應的市場資料</strong>
        <p>仍可查看你的相關部位與協議事件；缺少的利率或 TVL 不會以 0 代替。</p>
        <button type="button" @click="() => refreshProduct()">重新嘗試</button>
      </section>

        <section v-if="product" class="metric-grid" aria-label="產品摘要">
          <article>
            <span>目前利率</span>
            <strong>{{ product.rate.toFixed(2) }}% {{ product.rateType }}</strong>
            <small>{{ product.rateType === 'APY' ? '包含複利效果' : '未計複利' }}</small>
          </article>
          <article>
            <span>TVL</span>
            <strong>{{ formatUsd(product.tvlUsd) }}</strong>
            <small>此產品目前規模</small>
          </article>
          <article>
            <span>持倉辨識</span>
            <strong>{{ product.positionReadable ? '已支援' : '尚未支援' }}</strong>
            <small>{{ product.positionReadable ? '可從公開地址核對' : '目前只提供市場資料' }}</small>
          </article>
          <article>
            <span>資料狀態</span>
            <strong>{{ productResponse?.meta.status === 'fresh' ? '最新資料' : productResponse?.meta.status === 'stale' ? '資料稍舊' : '來源不完整' }}</strong>
            <small>更新 {{ formatTime(product.fetchedAt) }}</small>
          </article>
        </section>

        <section class="detail-section">
          <div class="section-head">
            <div>
              <h2>你的相關部位</h2>
              <p>只顯示同協議、同鏈與同資產的鏈上核對結果。</p>
            </div>
          </div>

          <div v-if="!isConnected" class="state-card compact">
            <strong>尚未連接錢包</strong>
            <p>連接後才會使用公開地址核對你在此協議的相關部位。</p>
          </div>
          <div v-else-if="portfolioPending" class="state-card compact">
            <strong>正在讀取鏈上部位…</strong>
          </div>
          <div v-else-if="portfolioError" class="state-card compact error">
            <strong>目前無法核對你的部位</strong>
            <p>{{ portfolioError }}</p>
          </div>
          <div v-else-if="relatedPositions.length === 0" class="state-card compact">
            <strong>沒有找到相關部位</strong>
            <p>這代表目前沒有在已支援 adapter 中辨識到部位，不代表協議或產品本身不存在。</p>
          </div>
          <div v-else class="position-list">
            <article v-for="position in relatedPositions" :key="`${position.contractAddress}:${position.kind}`">
              <div>
                <span>{{ positionKindLabel(position.kind) }}</span>
                <strong>{{ position.product }}</strong>
                <small>{{ position.verification === 'ONCHAIN' ? '鏈上直接讀取' : '官方索引發現 · 鏈上核對' }}</small>
              </div>
              <dl>
                <div><dt>數量</dt><dd>{{ position.amount.toLocaleString('en-US', { maximumFractionDigits: 4 }) }} {{ position.asset }}</dd></div>
                <div><dt>估值</dt><dd>{{ formatFullUsd(position.valueUsd) }}</dd></div>
                <div><dt>利率</dt><dd>{{ position.rate === null || !position.rateType ? '資料暫缺' : `${position.rate.toFixed(2)}% ${position.rateType}` }}</dd></div>
              </dl>
            </article>
          </div>
        </section>

        <section class="detail-section">
          <div class="section-head">
            <div>
              <h2>需要留意</h2>
              <p>只收錄正式來源中的安全、暫停、升級與重要治理事件。</p>
            </div>
          </div>

          <div v-if="!supportsEvents" class="state-card compact">
            <strong>此協議尚未接入正式事件來源</strong>
            <p>市場資料可用，但不會因為缺少事件資料就推論目前沒有風險。</p>
          </div>
          <div v-else-if="eventsPending" class="state-card compact"><strong>正在核對正式事件…</strong></div>
          <div v-else-if="eventsError" class="state-card compact error">
            <strong>事件來源目前不可用</strong>
            <p>這不代表目前沒有事件。</p>
          </div>
          <div v-else-if="productEvents.length === 0" class="state-card compact">
            <strong>最近 45 天沒有找到符合範圍的重要正式事件</strong>
            <p>此結論只涵蓋目前已接入的正式來源。</p>
          </div>
          <div v-else class="event-list">
            <article v-for="event in productEvents" :key="event.id" :class="`event-${event.severity.toLowerCase()}`">
              <div>
                <span>{{ eventTypeLabel(event) }}</span>
                <strong>{{ event.title }}</strong>
                <p>{{ event.summary }}</p>
              </div>
              <a :href="event.sourceUrl" target="_blank" rel="noopener noreferrer">查看 {{ event.source }} ↗</a>
            </article>
          </div>
        </section>

        <section class="detail-section evidence-section">
          <div class="section-head">
            <div>
              <h2>資料與原始連結</h2>
              <p>這裡提供事實與來源，不替使用者執行交易或做搬倉決策。</p>
            </div>
          </div>
          <dl v-if="product" class="evidence-list">
            <div><dt>市場資料來源</dt><dd>{{ product.source }} · {{ sourceLabel(product.sourceKind) }}</dd></div>
            <div><dt>最後取得時間</dt><dd>{{ formatTime(product.fetchedAt) }}</dd></div>
            <div><dt>利率口徑</dt><dd>{{ product.rateType }}；不與另一種口徑直接比較</dd></div>
            <div v-if="productResponse?.meta.cacheFallback"><dt>更新狀態</dt><dd>上游暫時失敗，正在顯示最近一次成功資料</dd></div>
          </dl>
          <div class="source-actions">
            <a v-if="product?.productUrl" :href="product.productUrl" target="_blank" rel="noopener noreferrer">開啟產品連結 ↗</a>
            <a v-if="product?.sourceUrl" :href="product.sourceUrl" target="_blank" rel="noopener noreferrer">查看資料來源 ↗</a>
          </div>
        </section>
    </main>
  </div>
</template>

<style scoped>
* { box-sizing: border-box; }
.page { min-height: 100vh; background: var(--color-background); color: var(--color-text-primary); }
.header { position: sticky; z-index: 20; top: 0; border-bottom: 1px solid var(--color-border); background: color-mix(in srgb, var(--color-background) 92%, transparent); backdrop-filter: blur(16px); }
.header-inner { display: flex; max-width: 1200px; min-height: 92px; align-items: center; justify-content: space-between; margin: 0 auto; padding: 14px 32px; }
.brand { display: inline-flex; gap: 12px; align-items: center; color: inherit; font-size: 1.125rem; font-weight: 750; text-decoration: none; }
.mark { display: grid; width: 36px; height: 36px; place-items: center; border-radius: 10px; background: var(--color-mark-bg); color: var(--color-mark-fg); font-weight: 800; }
.header-actions { display: flex; gap: 16px; align-items: flex-start; }
.theme-toggle { padding: 9px 12px; border: 1px solid var(--color-border); border-radius: 10px; background: var(--color-surface); color: var(--color-text-secondary); cursor: pointer; font: inherit; font-size: .8125rem; }
.content { max-width: 1200px; margin: 0 auto; padding: 48px 32px 96px; }
.back-link { display: inline-flex; margin-bottom: 24px; color: var(--color-text-secondary); text-decoration: none; }
.back-link:hover { color: var(--color-text-primary); }
.product-hero { display: flex; gap: 32px; align-items: flex-start; justify-content: space-between; padding: 36px; border: 1px solid var(--color-border); border-radius: 24px; background: var(--color-surface); }
.eyebrow { margin: 0 0 10px; color: #168f87; font-size: .8125rem; font-weight: 700; letter-spacing: .03em; text-transform: uppercase; }
.product-hero h1 { max-width: 760px; margin: 0; font-size: clamp(1.8rem, 4vw, 3rem); line-height: 1.15; letter-spacing: -.035em; }
.product-hero p:last-child { margin: 14px 0 0; color: var(--color-text-secondary); line-height: 1.65; }
.hero-tags { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
.hero-tags span { padding: 6px 10px; border: 1px solid var(--color-border); border-radius: 999px; background: var(--color-surface-soft); color: var(--color-text-secondary); font-size: .75rem; white-space: nowrap; }
.hero-tags .source-official_api { border-color: color-mix(in srgb, #168f87 40%, var(--color-border)); color: #168f87; }
.hero-tags .source-onchain { border-color: color-mix(in srgb, #7167d9 40%, var(--color-border)); color: #7167d9; }
.hero-tags .source-third_party_aggregator { border-color: color-mix(in srgb, #b7791f 40%, var(--color-border)); color: #a56813; }
.metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top: 20px; }
.metric-grid article { min-width: 0; padding: 24px; border: 1px solid var(--color-border); border-radius: 18px; background: var(--color-surface); }
.metric-grid span, .metric-grid small { display: block; color: var(--color-text-muted); font-size: .8125rem; }
.metric-grid strong { display: block; margin: 12px 0 8px; font-size: 1.35rem; font-variant-numeric: tabular-nums; }
.detail-section { margin-top: 56px; }
.section-head { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 18px; }
.section-head h2 { margin: 0; font-size: 1.35rem; }
.section-head p { margin: 7px 0 0; color: var(--color-text-secondary); }
.state-card { margin-top: 20px; padding: 28px; border: 1px dashed var(--color-border); border-radius: 18px; background: var(--color-surface); }
.state-card.compact { margin: 0; }
.state-card strong { font-size: 1rem; }
.state-card p { margin: 8px 0 0; color: var(--color-text-secondary); line-height: 1.65; }
.state-card.error { border-color: color-mix(in srgb, #b75b4b 45%, var(--color-border)); }
.state-card button { margin-top: 14px; padding: 8px 12px; border: 1px solid var(--color-border); border-radius: 9px; background: var(--color-surface); color: inherit; cursor: pointer; }
.position-list, .event-list { overflow: hidden; border: 1px solid var(--color-border); border-radius: 18px; background: var(--color-surface); }
.position-list > article { display: flex; gap: 24px; align-items: center; justify-content: space-between; padding: 22px 24px; border-top: 1px solid var(--color-border-subtle); }
.position-list > article:first-child, .event-list > article:first-child { border-top: 0; }
.position-list article > div:first-child { display: grid; gap: 5px; }
.position-list span, .position-list small { color: var(--color-text-muted); font-size: .75rem; }
.position-list dl { display: flex; gap: 28px; margin: 0; text-align: right; }
.position-list dl div { display: grid; gap: 5px; }
.position-list dt, .evidence-list dt { color: var(--color-text-muted); font-size: .75rem; }
.position-list dd, .evidence-list dd { margin: 0; font-size: .875rem; font-weight: 650; }
.event-list > article { display: flex; gap: 24px; justify-content: space-between; padding: 22px 24px; border-top: 1px solid var(--color-border-subtle); border-left: 3px solid var(--color-status-attention); }
.event-list article.event-critical { border-left-color: #b75b4b; }
.event-list article.event-info { border-left-color: #5f7fa8; }
.event-list article > div { display: grid; gap: 7px; }
.event-list span { color: var(--color-text-muted); font-size: .75rem; }
.event-list p { margin: 0; color: var(--color-text-secondary); line-height: 1.55; }
.event-list a, .source-actions a { align-self: center; color: #168f87; font-size: .8125rem; font-weight: 650; text-decoration: none; white-space: nowrap; }
.evidence-section { padding: 28px; border: 1px solid var(--color-border); border-radius: 18px; background: var(--color-surface); }
.evidence-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; margin: 0; }
.evidence-list div { display: grid; gap: 6px; }
.source-actions { display: flex; gap: 18px; margin-top: 24px; padding-top: 18px; border-top: 1px solid var(--color-border-subtle); }
@media (max-width: 820px) {
  .header-inner, .content { padding-right: 20px; padding-left: 20px; }
  .header-actions { align-items: flex-end; }
  .product-hero { flex-direction: column; padding: 26px; }
  .hero-tags { justify-content: flex-start; }
  .metric-grid { grid-template-columns: repeat(2, 1fr); }
  .position-list > article, .event-list > article { flex-direction: column; align-items: flex-start; }
  .position-list dl { width: 100%; justify-content: space-between; text-align: left; }
}
@media (max-width: 600px) {
  .header-inner { min-height: auto; align-items: flex-start; }
  .header-actions { flex-direction: column; gap: 8px; }
  .theme-toggle { align-self: flex-end; }
  .content { padding-top: 30px; }
  .metric-grid, .evidence-list { grid-template-columns: 1fr; }
  .position-list dl { flex-direction: column; gap: 14px; }
}
</style>
