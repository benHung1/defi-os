import type { ChainEventSeverity, ChainEventType } from '../../shared/types/chainEvents'

export type DailyDecisionStatus =
  | 'ONBOARDING'
  | 'LOADING'
  | 'UNKNOWN'
  | 'REVIEW_NOW'
  | 'WATCH'
  | 'MAINTAIN'
  | 'NO_POSITIONS'

export type DailyDecisionTone = 'neutral' | 'healthy' | 'watch' | 'critical'

export type DailyDecisionReasonCode =
  | 'READ_ONLY_WALLET'
  | 'PORTFOLIO_LOADING'
  | 'PORTFOLIO_UNAVAILABLE'
  | 'NO_SUPPORTED_POSITIONS'
  | 'SECURITY_EVENT'
  | 'PAUSE_EVENT'
  | 'PROTOCOL_CHANGE'
  | 'EVENT_COVERAGE_UNAVAILABLE'
  | 'PARTIAL_DATA'
  | 'PORTFOLIO_VERIFIED'
  | 'NO_MATERIAL_EVENT'
  | 'MARKET_COMPARISON'

export interface DailyDecisionEvent {
  id: string
  type: ChainEventType
  severity: ChainEventSeverity
  protocol: string
  title: string
  source: string
}

export interface DailyDecisionInput {
  connected: boolean
  portfolio: {
    status: 'idle' | 'loading' | 'error' | 'ready'
    error?: string
    addressLabel?: string
    assetCount: number
    positionCount: number
    protocolCount: number
    partial: boolean
  }
  events: {
    status: 'idle' | 'loading' | 'error' | 'ready'
    supportedProtocolCount: number
    providerPartial: boolean
    providersUnavailable: boolean
    items: DailyDecisionEvent[]
  }
  comparison: {
    status: 'idle' | 'loading' | 'error' | 'ready'
    candidateCount: number
    bestRateDelta: number | null
    bestAnnualDeltaUsd: number | null
    rateType: 'APR' | 'APY' | null
  }
}

export interface DailyDecisionReason {
  code: DailyDecisionReasonCode
  text: string
  source?: string
}

export interface DailyDecisionResult {
  status: DailyDecisionStatus
  tone: DailyDecisionTone
  question: string
  headline: string
  statement: string
  reasons: DailyDecisionReason[]
  primaryAction?: { label: string, target: '#portfolio' | '#your-usdc' | '#chain-events' }
}

function comparisonReason (input: DailyDecisionInput): DailyDecisionReason | null {
  const comparison = input.comparison
  if (comparison.status !== 'ready'
    || comparison.candidateCount === 0
    || comparison.bestRateDelta === null
    || comparison.bestRateDelta <= 0
    || comparison.rateType === null) return null

  const annualDifference = comparison.bestAnnualDeltaUsd !== null
    ? `，依目前部位估算年化差額約 US$${comparison.bestAnnualDeltaUsd.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`
    : ''

  return {
    code: 'MARKET_COMPARISON',
    text: `找到 ${comparison.candidateCount} 個同為 ${comparison.rateType} 口徑的候選，最高利率差 +${comparison.bestRateDelta.toFixed(2)}%${annualDifference}；這是市場差異，不是搬倉建議。`
  }
}

function portfolioReason (input: DailyDecisionInput): DailyDecisionReason {
  const portfolio = input.portfolio
  return {
    code: 'PORTFOLIO_VERIFIED',
    text: `已核對 ${portfolio.protocolCount} 個協議、${portfolio.positionCount} 個鏈上部位${portfolio.addressLabel ? `（${portfolio.addressLabel}）` : ''}。`
  }
}

function appendCoverageReason (reasons: DailyDecisionReason[], input: DailyDecisionInput): DailyDecisionReason[] {
  if (input.portfolio.partial || input.events.providerPartial) {
    reasons.push({ code: 'PARTIAL_DATA', text: '部分持倉或事件來源暫時不可用，目前結論只根據已成功核對的資料。' })
  }
  const market = comparisonReason(input)
  if (market) reasons.push(market)
  return reasons.slice(0, 3)
}

export function evaluateDailyDecision (input: DailyDecisionInput): DailyDecisionResult {
  if (!input.connected) {
    return {
      status: 'ONBOARDING',
      tone: 'neutral',
      question: '開始前，先連接你的錢包',
      headline: '連接錢包後，查看真正與你相關的 DeFi 提醒',
      statement: 'DeFi OS 只使用公開地址整理資產、部位和相關事件，不要求交易或 Token 授權。',
      reasons: [
        { code: 'READ_ONLY_WALLET', text: '只讀取公開地址與鏈上公開資料' },
        { code: 'READ_ONLY_WALLET', text: '不要求交易、Token Approval 或任意簽名' },
        { code: 'READ_ONLY_WALLET', text: '你可以隨時中斷連線' }
      ]
    }
  }

  if (input.portfolio.status === 'loading' || input.events.status === 'loading') {
    return {
      status: 'LOADING',
      tone: 'neutral',
      question: '正在核對今天的資料',
      headline: '正在整理你的部位與相關事件…',
      statement: '完成持倉和官方事件來源核對後，才會產生今日結論。',
      reasons: [
        { code: 'PORTFOLIO_LOADING', text: '正在讀取公開鏈上部位' },
        { code: 'PORTFOLIO_LOADING', text: '正在比對持倉協議的正式事件來源' }
      ]
    }
  }

  if (input.portfolio.status === 'error' || input.portfolio.status === 'idle') {
    return {
      status: 'UNKNOWN',
      tone: 'watch',
      question: '今天有什麼需要我注意？',
      headline: '目前資料不足，暫時無法判斷',
      statement: input.portfolio.error ?? '錢包資產尚未完成核對；這不代表目前沒有需要注意的變化。',
      reasons: [
        { code: 'PORTFOLIO_UNAVAILABLE', text: '主要持倉資料目前無法取得' },
        { code: 'PORTFOLIO_UNAVAILABLE', text: '錢包仍維持唯讀連線，可以稍後重新整理' }
      ],
      primaryAction: { label: '查看投資組合狀態', target: '#portfolio' }
    }
  }

  if (input.portfolio.positionCount === 0) {
    return {
      status: 'NO_POSITIONS',
      tone: 'neutral',
      question: '今天有什麼需要我注意？',
      headline: '目前未找到已支援的 DeFi 部位',
      statement: input.portfolio.assetCount > 0
        ? `已找到 ${input.portfolio.assetCount} 種主要資產，但沒有可供決策規則核對的協議部位。`
        : '目前地址沒有找到已支援的主要資產或協議部位。',
      reasons: [
        { code: 'NO_SUPPORTED_POSITIONS', text: '沒有部位時不會呼叫外部事件來源，也不會假設資產狀態正常' },
        { code: 'NO_SUPPORTED_POSITIONS', text: 'DeFi OS 目前聚焦已支援的 Ethereum 協議部位' }
      ],
      primaryAction: { label: '查看支援範圍', target: '#portfolio' }
    }
  }

  const reviewEvent = input.events.items.find(event => event.type === 'SECURITY' || event.type === 'PAUSE')
  if (reviewEvent) {
    const isSecurity = reviewEvent.type === 'SECURITY'
    return {
      status: 'REVIEW_NOW',
      tone: 'critical',
      question: '今天需要我做什麼？',
      headline: `${reviewEvent.protocol} 部位出現需要立即檢查的${isSecurity ? '安全事件' : '合約狀態變更'}`,
      statement: '事件與你的已辨識部位相關；請先閱讀官方內容確認實際影響，不會在此直接要求交易。',
      reasons: appendCoverageReason([
        {
          code: isSecurity ? 'SECURITY_EVENT' : 'PAUSE_EVENT',
          text: reviewEvent.title,
          source: reviewEvent.source
        },
        portfolioReason(input)
      ], input),
      primaryAction: { label: '查看事件與持倉', target: '#chain-events' }
    }
  }

  const watchEvent = input.events.items.find(event => event.type === 'UPGRADE' || event.type === 'GOVERNANCE')
  if (watchEvent) {
    return {
      status: 'WATCH',
      tone: 'watch',
      question: '今天有什麼需要我注意？',
      headline: `今天有 ${input.events.items.length} 項持倉相關變化值得了解`,
      statement: '目前看到的是正式升級或治理變化，不等同於需要搬倉；請先查看原始來源。',
      reasons: appendCoverageReason([
        { code: 'PROTOCOL_CHANGE', text: `${watchEvent.protocol}：${watchEvent.title}`, source: watchEvent.source },
        portfolioReason(input)
      ], input),
      primaryAction: { label: '查看相關事件', target: '#chain-events' }
    }
  }

  const eventCoverageUnavailable = input.events.status === 'idle'
    || input.events.status === 'error'
    || input.events.providersUnavailable
    || input.events.providerPartial
    || input.events.supportedProtocolCount === 0
  if (input.portfolio.partial || eventCoverageUnavailable) {
    return {
      status: 'UNKNOWN',
      tone: 'watch',
      question: '今天有什麼需要我注意？',
      headline: '部分資料未完成核對，暫時無法下結論',
      statement: '這不代表目前沒有事件；DeFi OS 不會用缺少的資料推論一切正常。',
      reasons: appendCoverageReason([
        portfolioReason(input),
        {
          code: eventCoverageUnavailable ? 'EVENT_COVERAGE_UNAVAILABLE' : 'PARTIAL_DATA',
          text: input.events.supportedProtocolCount === 0
            ? '目前持倉協議尚未接入正式事件來源'
            : '部分持倉或正式事件來源暫時無法取得'
        }
      ], input),
      primaryAction: { label: '查看資料狀態', target: eventCoverageUnavailable ? '#chain-events' : '#portfolio' }
    }
  }

  return {
    status: 'MAINTAIN',
    tone: 'healthy',
    question: '今天需要我做什麼？',
    headline: '目前沒有發現需要處理的重大變化',
    statement: '已完成支援部位與正式事件來源核對；市場收益差異只作為參考，不構成行動建議。',
    reasons: appendCoverageReason([
      portfolioReason(input),
      { code: 'NO_MATERIAL_EVENT', text: '最近 45 天沒有找到與目前持倉範圍相符的重要正式事件' }
    ], input)
  }
}
