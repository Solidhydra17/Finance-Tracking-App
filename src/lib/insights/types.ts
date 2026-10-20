export type InsightTone = 'positive' | 'neutral' | 'watch' | 'alert'

export interface InsightCategorySlice {
  name: string
  amountLabel: string
  percentage: number
}

export interface InsightBudgetPressure {
  name: string
  plannedLabel: string
  actualLabel: string
  percentUsed: number
  isOver: boolean
  remainingLabel: string
  overageLabel: string
}

/** Calendar-month spend compared to the previous calendar month. */
export interface InsightMonthTrend {
  thisMonthExpensesLabel: string
  lastMonthExpensesLabel: string
  changePct: number | null
  direction: 'up' | 'down' | 'flat' | 'new'
  topCategoryName: string | null
  topCategoryChangePct: number | null
}

/** Simple progress toward a default 20% savings-rate goal + budget room. */
export interface InsightGoals {
  targetSavingsRatePct: number
  currentSavingsRatePct: number | null
  onTrack: boolean
  gapLabel: string | null
  budgetNote: string | null
}

export interface InsightContext {
  periodLabel: string
  incomeLabel: string
  expensesLabel: string
  netLabel: string
  savingsRatePct: number | null
  /** Calendar-month income/expenses used for goals (not week/year filter). */
  monthIncomeCents: number
  monthExpensesCents: number
  transactionCount: number
  topCategories: InsightCategorySlice[]
  largestExpenseLabel: string | null
  largestExpenseCategory: string | null
  budgetPressures: InsightBudgetPressure[]
  projectedBalanceLabel: string
  creditDebtLabel: string
  youOweLabel: string
  trend: InsightMonthTrend | null
  goals: InsightGoals | null
}

export interface InsightResult {
  /** Full text fallback (legacy / accessibility). */
  text: string
  observation: string
  suggestion: string
  trend: string | null
  goal: string | null
  tone: InsightTone
  source: 'local' | 'gemini'
  generatedAt: string
}

export interface InsightQuotaStatus {
  blockedUntil: string
  message: string
}

export interface DailyInsightRecord {
  day: string
  /** Snapshot of transactions when this insight was generated */
  txRevision: string
  insight: InsightResult
}

export type InsightLoadStatus =
  | 'loading'
  | 'ready'
  | 'offline_empty'
  | 'error'

export interface InsightViewState {
  status: InsightLoadStatus
  insight: InsightResult | null
  txRevision: string | null
  canRegenerate: boolean
  quota: InsightQuotaStatus | null
}

export const TARGET_SAVINGS_RATE_PCT = 20

export const composeInsightText = (
  observation: string,
  suggestion: string,
  trend: string | null,
  goal: string | null
): string => {
  return [observation, suggestion, trend, goal].filter(Boolean).join('\n\n')
}

/** Normalize older cached insights that only stored `text`. */
export const normalizeInsightResult = (raw: InsightResult): InsightResult => {
  if (raw.observation && raw.suggestion) return raw

  const blocks = (raw.text || '')
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)

  return {
    ...raw,
    observation: raw.observation || blocks[0] || raw.text || '',
    suggestion: raw.suggestion || blocks[1] || '',
    trend: raw.trend ?? blocks[2] ?? null,
    goal: raw.goal ?? blocks[3] ?? null,
  }
}
