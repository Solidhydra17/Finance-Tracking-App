import type { DashboardData } from '@/domain/dashboard/types'
import type { PlannedVsActual } from '@/domain/budget/budgetEngine'
import { centsToDisplay } from '@/lib/money'
import type { InsightBudgetPressure, InsightContext } from './types'

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

export const buildInsightContext = ({
  data,
  periodPreset,
  pva,
  categoryNames,
  projectedBalance,
  creditDebt,
  youOwe,
}: BuildArgs): InsightContext => {
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
      return {
        name: categoryNames.get(categoryId) || data.categoryBreakdown.find((c) => c.categoryId === categoryId)?.categoryName || 'Category',
        plannedLabel: centsToDisplay(status.plannedCents),
        actualLabel: centsToDisplay(status.actualCents),
        percentUsed,
        isOver: status.isOverBudget,
      }
    })
    .filter((b) => b.percentUsed >= 80)
    .sort((a, b) => b.percentUsed - a.percentUsed)
    .slice(0, 3)

  let largestExpenseCategory: string | null = null
  if (data.largestExpense) {
    const match = data.categoryBreakdown.find(
      (c) => c.categoryId === data.largestExpense?.categoryId
    )
    largestExpenseCategory = match?.categoryName ?? null
  }

  return {
    periodLabel: periodLabels[periodPreset] || 'this period',
    incomeLabel: centsToDisplay(income),
    expensesLabel: centsToDisplay(expenses),
    netLabel: centsToDisplay(net),
    savingsRatePct,
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
  }
}
