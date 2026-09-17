<script setup lang="ts">
type MarketTypeFilter = 'all' | 'lending' | 'savings' | 'vault'
type MarketSourceFilter = 'all' | 'official' | 'onchain' | 'third_party'
type MarketRateTypeFilter = 'all' | 'apr' | 'apy'
type MarketSort = 'tvl' | 'rate'

interface FilterOption<T extends string> {
  value: T
  label: string
  hint?: string
  tone: string
}

const props = defineProps<{
  type: MarketTypeFilter
  source: MarketSourceFilter
  rateType: MarketRateTypeFilter
  sort: MarketSort
}>()

const emit = defineEmits<{
  change: [filters: {
    type: MarketTypeFilter
    source: MarketSourceFilter
    rateType: MarketRateTypeFilter
    sort: MarketSort
  }]
}>()

const search = ref('')

const groups: Array<{
  label: string
  key: 'type' | 'source' | 'rateType' | 'sort'
  options: FilterOption<string>[]
}> = [
  {
    label: '產品類型',
    key: 'type' as const,
    options: [
      { value: 'all', label: '全部產品', tone: 'blue' },
      { value: 'lending', label: 'Lending', hint: '借貸供應', tone: 'cyan' },
      { value: 'savings', label: 'Savings', hint: '儲蓄產品', tone: 'green' },
      { value: 'vault', label: 'Curated Vault', hint: '策展金庫', tone: 'purple' }
    ] satisfies FilterOption<MarketTypeFilter>[]
  },
  {
    label: '資料來源',
    key: 'source' as const,
    options: [
      { value: 'all', label: '全部來源', tone: 'blue' },
      { value: 'official', label: '官方 API', tone: 'green' },
      { value: 'onchain', label: '鏈上合約', tone: 'purple' },
      { value: 'third_party', label: '第三方備援', tone: 'orange' }
    ] satisfies FilterOption<MarketSourceFilter>[]
  },
  {
    label: '利率口徑',
    key: 'rateType' as const,
    options: [
      { value: 'all', label: '全部口徑', tone: 'blue' },
      { value: 'apr', label: 'APR', hint: '未計複利', tone: 'cyan' },
      { value: 'apy', label: 'APY', hint: '已計複利', tone: 'green' }
    ] satisfies FilterOption<MarketRateTypeFilter>[]
  },
  {
    label: '排序方式',
    key: 'sort' as const,
    options: [
      { value: 'tvl', label: 'TVL', hint: '資金規模', tone: 'blue' },
      { value: 'rate', label: '利率', hint: '需先選 APR 或 APY', tone: 'orange' }
    ] satisfies FilterOption<MarketSort>[]
  }
]

const filteredGroups = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return groups
  return groups
    .map(group => ({
      ...group,
      options: group.options.filter(option =>
        `${option.label} ${option.hint ?? ''}`.toLowerCase().includes(term)
      )
    }))
    .filter(group => group.options.length > 0)
})

function isSelected (key: 'type' | 'source' | 'rateType' | 'sort', value: string): boolean {
  return props[key] === value
}

function select (key: 'type' | 'source' | 'rateType' | 'sort', value: string): void {
  const next = { type: props.type, source: props.source, rateType: props.rateType, sort: props.sort }
  if (key === 'type') next.type = value as MarketTypeFilter
  if (key === 'source') next.source = value as MarketSourceFilter
  if (key === 'rateType') {
    next.rateType = value as MarketRateTypeFilter
    if (next.rateType === 'all' && next.sort === 'rate') next.sort = 'tvl'
  }
  if (key === 'sort') {
    if (value === 'rate' && next.rateType === 'all') return
    next.sort = value as MarketSort
  }
  emit('change', next)
}
</script>

<template>
  <details class="filter-picker">
    <summary>
      <span class="scope-icon">Ξ</span>
      <span><strong>Ethereum · USDC</strong><small>篩選市場</small></span>
      <span class="summary-chevron" aria-hidden="true" />
    </summary>

    <div class="panel">
      <label class="search">
        <span aria-hidden="true">⌕</span>
        <input v-model="search" type="search" placeholder="搜尋篩選項目…">
      </label>

      <section class="fixed-scope">
        <p>目前資料範圍</p>
        <div class="option-grid">
          <div class="option selected"><i class="blue" />Ethereum</div>
          <div class="option selected"><i class="cyan" />USDC</div>
        </div>
      </section>

      <section v-for="group in filteredGroups" :key="group.key" class="filter-group">
        <p>{{ group.label }}</p>
        <div class="option-grid">
          <button
            v-for="option in group.options"
            :key="option.value"
            type="button"
            class="option"
            :class="{ selected: isSelected(group.key, option.value), disabled: group.key === 'sort' && option.value === 'rate' && rateType === 'all' }"
            :disabled="group.key === 'sort' && option.value === 'rate' && rateType === 'all'"
            @click="select(group.key, option.value)"
          >
            <i :class="option.tone" />
            <span>{{ option.label }}<small v-if="option.hint">{{ option.hint }}</small></span>
          </button>
        </div>
      </section>

      <p v-if="filteredGroups.length === 0" class="empty">找不到符合的篩選項目。</p>
    </div>
  </details>
</template>

<style scoped>
.filter-picker { position: relative; margin-top: 16px; }
.filter-picker > summary { display: inline-flex; gap: 10px; align-items: center; min-width: 250px; padding: 10px 12px; border: 1px solid var(--color-border); border-radius: 12px; background: var(--color-surface); cursor: pointer; list-style: none; }
.filter-picker > summary::-webkit-details-marker { display: none; }
.filter-picker > summary > span:nth-child(2) { display: grid; flex: 1; }
.filter-picker strong { font-size: .875rem; color: var(--color-text-primary); }
.filter-picker small { margin-top: 2px; font-size: .72rem; font-weight: 400; color: var(--color-text-muted); }
.scope-icon { display: grid; width: 28px; height: 28px; place-items: center; border-radius: 50%; background: #627eea; color: white; }
.summary-chevron { width: 7px; height: 7px; border-right: 1.5px solid currentColor; border-bottom: 1.5px solid currentColor; transform: rotate(45deg); }
.filter-picker[open] .summary-chevron { transform: rotate(225deg); }
.panel { position: absolute; z-index: 20; top: calc(100% + 8px); left: 0; width: min(680px, calc(100vw - 48px)); max-height: 70vh; overflow: auto; border: 1px solid var(--color-border); border-radius: 14px; background: var(--color-surface); box-shadow: 0 20px 50px rgb(0 0 0 / 20%); }
.search { display: flex; gap: 10px; align-items: center; margin: 10px; padding: 10px 12px; border: 1px solid var(--color-border); border-radius: 9px; color: var(--color-text-muted); }
.search input { width: 100%; border: 0; outline: 0; background: transparent; font: inherit; color: var(--color-text-primary); }
.filter-group, .fixed-scope { padding: 11px 20px 15px; border-top: 1px solid var(--color-border-subtle); }
.filter-group p, .fixed-scope p { margin: 0 0 8px; font-size: .75rem; color: var(--color-text-muted); }
.option-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 5px; }
.option { display: flex; gap: 9px; align-items: center; min-width: 0; padding: 9px 10px; border: 0; border-radius: 9px; background: transparent; font: inherit; font-size: .84rem; font-weight: 600; text-align: left; color: var(--color-text-body); }
button.option { cursor: pointer; }
.option:hover, .option.selected { background: var(--color-surface-soft); color: var(--color-text-primary); }
.option.disabled { cursor: not-allowed; opacity: .45; }
.option span { display: grid; min-width: 0; }
.option i { width: 13px; height: 13px; flex: 0 0 13px; border-radius: 50%; background: var(--dot); }
.option i.blue { --dot: #627eea; } .option i.cyan { --dot: #3bc4d4; } .option i.green { --dot: #46b981; } .option i.purple { --dot: #8067e8; } .option i.orange { --dot: #f59e42; }
.empty { padding: 24px; text-align: center; color: var(--color-text-muted); }
@media (max-width: 600px) { .panel { width: calc(100vw - 32px); } .option-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
