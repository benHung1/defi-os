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
  decision: {
    level: DecisionLevel
    headline: string
    statement: string
    evidence: string[]
  }
  portfolio: SummaryItem[]
  market: SummaryItem[]
  events: ChainEvent[]
  updatedAt: string
}

const dashboard: Dashboard = {
  greeting: '早安',
  date: '2026 年 8 月 5 日',
  decision: {
    level: 'attention',
    headline: '有 1 個協議需要你留意',
    statement: '其餘持倉維持穩定，今天不需要調整。',
    evidence: [
      'Aave 的 USDC 存款 APR 由 5.2% 降至 3.4%',
      '單一協議佔投資組合 58%，集中度偏高',
      '過去 7 天沒有偵測到相關安全事件'
    ]
  },
  portfolio: [
    { label: '投資組合價值', value: 'US$128,450', note: '手動輸入的持倉合計' },
    { label: '資產', value: '4 種', note: 'USDC、ETH、WBTC、stETH' },
    { label: '協議', value: '3 個', note: 'Aave、Lido、Compound' },
    { label: '鏈', value: '2 條', note: 'Ethereum、Arbitrum' }
  ],
  market: [
    { label: '最高 TVL', value: 'Lido', note: 'TVL US$32.1B · 示意資料' },
    { label: '最高 APR', value: 'Compound', note: 'USDC APR 6.8% · 示意資料' },
    { label: '關注度上升', value: 'Aave', note: '近 7 天 TVL +4.2% · 示意資料' }
  ],
  events: [
    {
      type: '協議升級',
      title: 'Aave 完成利率模型調整',
      protocol: 'Aave',
      attention: '需留意',
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
      type: '安全提醒',
      title: '外部監控回報一筆異常大額轉出',
      protocol: 'Compound',
      attention: '建議查看',
      time: '昨天 21:05'
    }
  ],
  updatedAt: '2026-08-05 16:40'
}

const isHealthy = dashboard.decision.level === 'healthy'

const { toggleLabel, toggleTheme } = useTheme()
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
        <p class="hero-question">今天需要做什麼嗎？</p>
        <h1 class="hero-headline">
          <span class="hero-dot">{{ isHealthy ? '🟢' : '🟡' }}</span>
          {{ dashboard.decision.headline }}
        </h1>
        <p class="hero-statement">{{ dashboard.decision.statement }}</p>

        <ul class="evidence">
          <li
            v-for="item in dashboard.decision.evidence"
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
          <h2>市場概況</h2>
          <p>目前值得比較的幾個位置</p>
        </div>
        <div class="grid grid-3">
          <SummaryCard
            v-for="item in dashboard.market"
            :key="item.label"
            :label="item.label"
            :value="item.value"
            :note="item.note"
          />
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

.grid-3 {
  grid-template-columns: repeat(3, 1fr);
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
  .grid-4,
  .grid-3 {
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
  .grid-4,
  .grid-3 {
    grid-template-columns: 1fr;
  }
}
</style>
