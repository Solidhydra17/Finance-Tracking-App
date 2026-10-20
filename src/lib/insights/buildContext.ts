import type { DashboardData } from '@/domain/dashboard/types'
import type { PlannedVsActual } from '@/domain/budget/budgetEngine'
import { dashboardEngine } from '@/domain/dashboard/dashboardEngine'
import { centsToDisplay } from '@/lib/money'
import { formatDateLocal, getMonthRange } from '@/lib/date'
import type { FilterState } from '@/types'
import type {
  InsightBudgetPressure,
  InsightContext,
  InsightGoals,
  InsightMonthTrend,
} from './types'
import { TARGET_SAVINGS_RATE_PCT } from './types'

type BuildArgs = {
  data: DashboardData
  periodPreset: string
  pva: Map<number, PlannedVsActual>
  categoryNames: Map<number, string>
  projectedBalance: number
  creditDebt: number
  youOwe: number
}

const periodLabels: Record<string, string> = {
  week: 'this week',
  month: 'this month',
  year: 'this year',
}

const monthFilters = (date: Date): FilterState => {
  const { start, end } = getMonthRange(date)
  return {
    dateRange: {
      preset: 'month',
      startDate: formatDateLocal(start),
      endDate: formatDateLocal(end),
    },
    categoryId: null,
    transactionType: 'all',
    loanOnly: false,
    searchQuery: '',
  }
}

const buildTrend = (
  thisMonth: DashboardData,
  lastMonth: DashboardData
): InsightMonthTrend => {
  const thisExp = thisMonth.summary.expenses
  const lastExp = lastMonth.summary.expenses

  let changePct: number | null = null
  let direction: InsightMonthTrend['direction'] = 'new'

  if (lastExp <= 0 && thisExp <= 0) {
    direction = 'flat'
    changePct = 0
  } else if (lastExp <= 0 && thisExp > 0) {
    direction = 'new'
    changePct = null
  } else {
    changePct = Math.round(((thisExp - lastExp) / lastExp) * 100)
    if (changePct > 2) direction = 'up'
    else if (changePct < -2) direction = 'down'
    else direction = 'flat'
  }

  let topCategoryName: string | null = null
  let topCategoryChangePct: number | null = null
  const top = thisMonth.categoryBreakdown[0]
  if (top) {
    topCategoryName = top.categoryName
    const prev = lastMonth.categoryBreakdown.find((c) => c.categoryId === top.categoryId)
    if (prev && prev.total > 0) {
      topCategoryChangePct = Math.round(((top.total - prev.total) / prev.total) * 100)
    } else if (top.total > 0 && (!prev || prev.total <= 0)) {
      topCategoryChangePct = null
    }
  }

  return {
    thisMonthExpensesLabel: centsToDisplay(thisExp),
    lastMonthExpensesLabel: centsToDisplay(lastExp),
    changePct,
    direction,
    topCategoryName,
    topCategoryChangePct,
  }
}

const buildGoals = (
  monthIncomeCents: number,
  monthExpensesCents: number,
  budgetPressures: InsightBudgetPressure[]
): InsightGoals => {
  const currentSavingsRatePct =
    monthIncomeCents > 0
      ? Math.round(((monthIncomeCents - monthExpensesCents) / monthIncomeCents) * 100)
      : null

  const targetSaveCents = Math.round(monthIncomeCents * (TARGET_SAVINGS_RATE_PCT / 100))
  const currentSaveCents = monthIncomeCents - monthExpensesCents
  const onTrack =
    monthIncomeCents > 0 ? currentSaveCents >= targetSaveCents : false

  let gapLabel: string | null = null
  if (monthIncomeCents > 0) {
    const gap = Math.abs(targetSaveCents - currentSaveCents)
    if (onTrack) {
      gapLabel =
        gap === 0
          ? `Right on a ${TARGET_SAVINGS_RATE_PCT}% save rate.`
          : `${centsToDisplay(gap)} above a ${TARGET_SAVINGS_RATE_PCT}% save rate.`
    } else {
      gapLabel = `${centsToDisplay(gap)} more to save or cut to hit a ${TARGET_SAVINGS_RATE_PCT}% save rate.`
    }
  }

  let budgetNote: string | null = null
  const over = budgetPressures.find((b) => b.isOver)
  const under = [...budgetPressures]
    .filter((b) => !b.isOver)
    .sort((a, b) => b.percentUsed - a.percentUsed)[0]

  if (over) {
    budgetNote = `${over.overageLabel} over on ${over.name} this month.`
  } else if (under && under.percentUsed >= 50) {
    budgetNote = `${under.remainingLabel} left in ${under.name} this month.`
  }

  return {
    targetSavingsRatePct: TARGET_SAVINGS_RATE_PCT,
    currentSavingsRatePct,
    onTrack,
    gapLabel,
    budgetNote,
  }
}

export const buildInsightContext = async ({
  data,
  periodPreset,
  pva,
  categoryNames,
  projectedBalance,
  creditDebt,
  youOwe,
}: BuildArgs): Promise<InsightContext> => {
  const income = data.summary.income
  const expenses = data.summary.expenses
  const net = income - expenses
  const savingsRatePct =
    income > 0 ? Math.round(((income - expenses) / income) * 100) : null

  const topCategories = data.categoryBreakdown.slice(0, 4).map((c) => ({
    name: c.categoryName,
    amountLabel: centsToDisplay(c.total),
    percentage: Math.round(c.percentage),
  }))

  const budgetPressures: InsightBudgetPressure[] = Array.from(pva.entries())
    .map(([categoryId, status]) => {
      const percentUsed =
        status.plannedCents > 0
          ? Math.round((status.actualCents / status.plannedCents) * 100)
          : 0
      const remaining = Math.max(0, status.plannedCents - status.actualCents)
      const overage = Math.max(0, status.actualCents - status.plannedCents)
      return {
        name:
          categoryNames.get(categoryId) ||
          data.categoryBreakdown.find((c) => c.categoryId === categoryId)?.categoryName ||
          'Category',
        plannedLabel: centsToDisplay(status.plannedCents),
        actualLabel: centsToDisplay(status.actualCents),
        percentUsed,
        isOver: status.isOverBudget,
        remainingLabel: centsToDisplay(remaining),
        overageLabel: centsToDisplay(overage),
      }
    })
    .filter((b) => b.percentUsed >= 50)
    .sort((a, b) => b.percentUsed - a.percentUsed)
    .slice(0, 3)

  let largestExpenseCategory: string | null = null
  if (data.largestExpense) {
    const match = data.categoryBreakdown.find(
      (c) => c.categoryId === data.largestExpense?.categoryId
    )
    largestExpenseCategory = match?.categoryName ?? null
  }

  // Always compare full calendar months for trend / goals
  const now = new Date()
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 15)
  let monthIncomeCents = income
  let monthExpensesCents = expenses
  let trend: InsightMonthTrend | null = null

  try {
    const [thisMonthData, lastMonthData] = await Promise.all([
      dashboardEngine.getDashboardData(monthFilters(now), false),
      dashboardEngine.getDashboardData(monthFilters(lastMonthDate), false),
    ])
    monthIncomeCents = thisMonthData.summary.income
    monthExpensesCents = thisMonthData.summary.expenses
    trend = buildTrend(thisMonthData, lastMonthData)
  } catch {
    trend = null
  }

  const goals = buildGoals(monthIncomeCents, monthExpensesCents, budgetPressures)

  return {
    periodLabel: periodLabels[periodPreset] || 'this period',
    incomeLabel: centsToDisplay(income),
    expensesLabel: centsToDisplay(expenses),
    netLabel: centsToDisplay(net),
    savingsRatePct,
    monthIncomeCents,
    monthExpensesCents,
    transactionCount: data.transactionCount,
    topCategories,
    largestExpenseLabel: data.largestExpense
      ? centsToDisplay(data.largestExpense.amount)
      : null,
    largestExpenseCategory,
    budgetPressures,
    projectedBalanceLabel: centsToDisplay(projectedBalance),
    creditDebtLabel: centsToDisplay(creditDebt),
    youOweLabel: centsToDisplay(youOwe),
    trend,
    goals,
  }
}

export const formatTrendSection = (ctx: InsightContext): string | null => {
  const t = ctx.trend
  if (!t) return null

  let line: string
  if (t.direction === 'new') {
    line = `This month you’ve spent ${t.thisMonthExpensesLabel}. No full last-month baseline to compare yet.`
  } else if (t.direction === 'flat' || t.changePct === 0) {
    line = `Spending is about even with last month (${t.thisMonthExpensesLabel} vs ${t.lastMonthExpensesLabel}).`
  } else if (t.direction === 'up') {
    line = `Spending is up ${t.changePct}% vs last month (${t.thisMonthExpensesLabel} vs ${t.lastMonthExpensesLabel}).`
  } else {
    line = `Spending is down ${Math.abs(t.changePct || 0)}% vs last month (${t.thisMonthExpensesLabel} vs ${t.lastMonthExpensesLabel}).`
  }

  if (t.topCategoryName && t.topCategoryChangePct !== null) {
    const dir = t.topCategoryChangePct > 0 ? 'up' : t.topCategoryChangePct < 0 ? 'down' : 'flat'
    if (dir === 'flat') {
      line += ` ${t.topCategoryName} is roughly flat month over month.`
    } else {
      line += ` ${t.topCategoryName} is ${dir} ${Math.abs(t.topCategoryChangePct)}%.`
    }
  } else if (t.topCategoryName) {
    line += ` Top category this month: ${t.topCategoryName}.`
  }

  return line
}

export const formatGoalSection = (ctx: InsightContext): string | null => {
  const g = ctx.goals
  if (!g) return null

  const parts: string[] = []
  if (g.currentSavingsRatePct !== null) {
    parts.push(
      `Save-rate goal: ${g.targetSavingsRatePct}% — you’re at ${g.currentSavingsRatePct}%.`
    )
  } else {
    parts.push(`Save-rate goal: ${g.targetSavingsRatePct}% — add income this month to track it.`)
  }
  if (g.gapLabel) parts.push(g.gapLabel)
  if (g.budgetNote) parts.push(g.budgetNote)
  return parts.join(' ')
}
