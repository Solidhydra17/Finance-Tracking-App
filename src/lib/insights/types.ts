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
}

export interface InsightContext {
  periodLabel: string
  incomeLabel: string
  expensesLabel: string
  netLabel: string
  savingsRatePct: number | null
  transactionCount: number
  topCategories: InsightCategorySlice[]
  largestExpenseLabel: string | null
  largestExpenseCategory: string | null
  budgetPressures: InsightBudgetPressure[]
  projectedBalanceLabel: string
  creditDebtLabel: string
  youOweLabel: string
}

export interface InsightResult {
  text: string
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
