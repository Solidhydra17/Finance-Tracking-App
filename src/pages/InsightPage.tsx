import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { AiInsightCard } from '@/components/dashboard/AiInsightCard'
import { useBudget, useCategories, useDashboard } from '@/hooks'
import { centsToDisplay } from '@/lib/money'
import { formatDateLocal, getMonthRange, getWeekRange, getYearRange } from '@/lib/date'
import { transactionRepository } from '@/storage'
import { useLoanStore, useUIStore, useWalletStore } from '@/store'
import { budgetEngine, type PlannedVsActual } from '@/domain/budget/budgetEngine'
import { calculateBalances } from '@/lib/balances'
import type { Transaction } from '@/types'

type Preset = 'week' | 'month' | 'year'
type Bucket = { label: string; start: string; end: string; income: number; expense: number }

const parseDate = (value: string) => new Date(`${value}T00:00:00`)

const shiftRange = (start: string, end: string, preset: Preset) => {
  const nextStart = parseDate(start)
  const nextEnd = parseDate(end)
  if (preset === 'week') {
    nextStart.setDate(nextStart.getDate() - 7)
    nextEnd.setDate(nextEnd.getDate() - 7)
    return { start: formatDateLocal(nextStart), end: formatDateLocal(nextEnd) }
  }
  if (preset === 'month') {
    const previousStart = new Date(nextStart.getFullYear(), nextStart.getMonth() - 1, 1)
    const previousEnd = new Date(nextStart.getFullYear(), nextStart.getMonth(), 0)
    return { start: formatDateLocal(previousStart), end: formatDateLocal(previousEnd) }
  }
  nextStart.setFullYear(nextStart.getFullYear() - 1)
  nextEnd.setFullYear(nextEnd.getFullYear() - 1)
  return { start: formatDateLocal(nextStart), end: formatDateLocal(nextEnd) }
}

const buildBuckets = (preset: Preset, start: string, end: string): Bucket[] => {
  const startDate = parseDate(start)
  const endDate = parseDate(end)
  if (preset === 'week') {
    const days: Bucket[] = []
    for (let cursor = new Date(startDate); cursor <= endDate; cursor.setDate(cursor.getDate() + 1)) {
      const key = formatDateLocal(cursor)
      days.push({ label: cursor.toLocaleDateString('en-US', { weekday: 'short' }), start: key, end: key, income: 0, expense: 0 })
    }
    return days
  }
  if (preset === 'year') {
    const months: Bucket[] = []
    for (let month = 0; month <= endDate.getMonth(); month += 1) {
      const monthStart = new Date(endDate.getFullYear(), month, 1)
      const monthEnd = new Date(endDate.getFullYear(), month + 1, 0)
      months.push({
        label: monthStart.toLocaleDateString('en-US', { month: 'short' }),
        start: formatDateLocal(monthStart),
        end: formatDateLocal(monthEnd),
        income: 0,
        expense: 0,
      })
    }
    return months
  }
  const weeks: Bucket[] = []
  let cursor = new Date(startDate)
  while (cursor <= endDate) {
    const weekEnd = new Date(cursor)
    weekEnd.setDate(weekEnd.getDate() + 6)
    if (weekEnd > endDate) weekEnd.setTime(endDate.getTime())
    weeks.push({ label: `${cursor.getDate()}–${weekEnd.getDate()}`, start: formatDateLocal(cursor), end: formatDateLocal(weekEnd), income: 0, expense: 0 })
    cursor = new Date(weekEnd)
    cursor.setDate(cursor.getDate() + 1)
  }
  return weeks
}

const fillBuckets = (buckets: Bucket[], transactions: Transaction[]) => {
  transactions.forEach((transaction) => {
    if (transaction.deletedAt || transaction.type === 'fund_transfer' || transaction.type === 'credit_payment') return
    const bucket = buckets.find((entry) => transaction.date >= entry.start && transaction.date <= entry.end)
    if (!bucket) return
    if (transaction.type === 'income') bucket.income += transaction.amount
    if (transaction.type === 'expense') bucket.expense += transaction.amount
  })
  return buckets
}

const smoothLine = (points: Array<{ x: number; y: number }>) => {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
  let path = `M ${points[0].x} ${points[0].y}`
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[index - 1] ?? points[index]
    const current = points[index]
    const next = points[index + 1]
    const following = points[index + 2] ?? next
    const low = Math.min(previous.y, current.y, next.y, following.y)
    const high = Math.max(previous.y, current.y, next.y, following.y)
    const control1x = current.x + (next.x - previous.x) / 6
    const control1y = Math.min(high, Math.max(low, current.y + (next.y - previous.y) / 6))
    const control2x = next.x - (following.x - current.x) / 6
    const control2y = Math.min(high, Math.max(low, next.y - (following.y - current.y) / 6))
    path += ` C ${control1x} ${control1y}, ${control2x} ${control2y}, ${next.x} ${next.y}`
  }
  return path
}

export const InsightPage = () => {
  const { filters, setFilters, balancesHidden } = useUIStore(useShallow((state) => ({
    filters: state.filters,
    setFilters: state.setFilters,
    balancesHidden: state.balancesHidden,
  })))
  const { data } = useDashboard(filters, true)
  const { plan, items } = useBudget()
  const { categories } = useCategories()
  const { totalWalletBalance, totalCreditDebt, totalWalletLoanDebt } = useWalletStore(useShallow((state) => ({
    totalWalletBalance: state.totalWalletBalance,
    totalCreditDebt: state.totalCreditDebt,
    totalWalletLoanDebt: state.totalWalletLoanDebt,
  })))
  const totalYouOwe = useLoanStore((state) => state.totalYouOwe)
  const [pva, setPva] = useState<Map<number, PlannedVsActual>>(new Map())
  const [currentTx, setCurrentTx] = useState<Transaction[]>([])
  const [previousTx, setPreviousTx] = useState<Transaction[]>([])

  const preset = (filters.dateRange.preset === 'week' || filters.dateRange.preset === 'year' ? filters.dateRange.preset : 'month') as Preset

  useEffect(() => {
    if (items.length === 0) return
    budgetEngine.getPlannedVsActual(items, plan?.workDaysPerWeek || 5).then(setPva)
  }, [items, plan?.workDaysPerWeek])

  useEffect(() => {
    const previous = shiftRange(filters.dateRange.startDate, filters.dateRange.endDate, preset)
    transactionRepository.getByDateRange(filters.dateRange.startDate, filters.dateRange.endDate).then(setCurrentTx)
    transactionRepository.getByDateRange(previous.start, previous.end).then(setPreviousTx)
  }, [filters.dateRange.startDate, filters.dateRange.endDate, preset])

  const handlePresetChange = (next: Preset) => {
    const now = new Date()
    const range = next === 'week' ? getWeekRange(now) : next === 'year' ? getYearRange(now) : getMonthRange(now)
    setFilters({ dateRange: { preset: next, startDate: formatDateLocal(range.start), endDate: formatDateLocal(range.end) } })
  }

  const buckets = useMemo(
    () => fillBuckets(buildBuckets(preset, filters.dateRange.startDate, filters.dateRange.endDate), currentTx),
    [preset, filters.dateRange.startDate, filters.dateRange.endDate, currentTx],
  )
  const maxBar = Math.max(1, ...buckets.map((bucket) => bucket.expense))
  const maxFlow = Math.max(1, ...buckets.flatMap((bucket) => [bucket.income, bucket.expense]))
  const points = (key: 'income' | 'expense') => buckets.map((bucket, index) => ({
    x: buckets.length === 1 ? 160 : (index / (buckets.length - 1)) * 300 + 10,
    y: 110 - (bucket[key] / maxFlow) * 90,
  }))

  const movement = useMemo(() => {
    const totals = (rows: Transaction[]) => {
      const map = new Map<number, number>()
      rows.forEach((row) => {
        if (row.deletedAt || row.type === 'fund_transfer' || row.type === 'credit_payment') return
        map.set(row.categoryId, (map.get(row.categoryId) ?? 0) + row.amount)
      })
      return map
    }
    const current = totals(currentTx.filter((row) => row.type === 'expense' || row.type === 'income'))
    const previous = totals(previousTx.filter((row) => row.type === 'expense' || row.type === 'income'))
    const ids = new Set([...current.keys(), ...previous.keys()])
    return Array.from(ids).map((id) => {
      const category = categories.find((entry) => entry.id === id)
      const now = current.get(id) ?? 0
      const before = previous.get(id) ?? 0
      const change = before === 0 ? (now > 0 ? null : 0) : Math.round(((now - before) / before) * 100)
      return { id, name: category?.name ?? 'Category', color: category?.color ?? '#285ccc', now, before, change, type: category?.type }
    }).filter((row) => row.now > 0 || row.before > 0).sort((a, b) => b.now - a.now).slice(0, 6)
  }, [currentTx, previousTx, categories])

  const money = (cents: number) => (balancesHidden ? '••••' : centsToDisplay(cents))
  const { projectedBalance } = calculateBalances({
    totalWalletBalance,
    totalCreditDebt,
    walletLoanDebt: totalWalletLoanDebt,
    peerLoanDebt: totalYouOwe,
    totalOwedToYou: 0,
  })

  return (
    <div className="space-y-5 px-4 pb-8 pt-4">
      <header className="flex items-center gap-3">
        <Link to="/" aria-label="Back to home" className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--card-bg)] text-[var(--text-main)]">
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-extrabold text-midblue dark:text-white">Insight</h1>
      </header>

      {data && (
        <AiInsightCard
          data={data}
          periodPreset={preset}
          pva={pva}
          projectedBalance={projectedBalance}
          creditDebt={totalCreditDebt}
          youOwe={totalYouOwe}
          presentation="page"
        />
      )}

      <div className="flex gap-2">
        {(['week', 'month', 'year'] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => handlePresetChange(option)}
            className={`h-11 flex-1 rounded-xl border-2 border-midblue text-sm font-bold capitalize transition-colors duration-300 ${preset === option ? 'bg-midblue text-white' : 'bg-[var(--card-bg)] text-midblue'}`}
          >
            {option}
          </button>
        ))}
      </div>

      <section key={`bars-${preset}`} className="rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">Spending by period</h2>
        <div className="flex h-40 items-end gap-2">
          {buckets.map((bucket, index) => (
            <div key={bucket.label} className="flex h-full flex-1 flex-col justify-end gap-2">
              <div className={`w-full origin-bottom animate-bar-rise rounded-t-md ${index === buckets.length - 1 ? 'bg-midblue' : 'bg-midblue/35'}`} style={{ height: bucket.expense === 0 ? '2px' : `${Math.max(8, (bucket.expense / maxBar) * 100)}%`, animationDelay: `${index * 45}ms` }} />
              <span className="truncate text-center text-[10px] font-bold text-[var(--text-muted)]">{bucket.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section key={`flow-${preset}`} className="rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">Cash flow</h2>
        <svg viewBox="0 0 320 140" className="h-40 w-full" role="img" aria-label="Income and expense over the selected period">
          <path d={smoothLine(points('income'))} pathLength={1} fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" className="animate-line-draw" />
          <path d={smoothLine(points('expense'))} pathLength={1} fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" className="animate-line-draw" style={{ animationDelay: '80ms' }} />
        </svg>
        <div className="mt-2 flex gap-4 text-xs font-bold">
          <span className="text-success-600">Income {money(buckets.reduce((sum, bucket) => sum + bucket.income, 0))}</span>
          <span className="text-danger-500">Expenses {money(buckets.reduce((sum, bucket) => sum + bucket.expense, 0))}</span>
        </div>
      </section>

      <section key={`move-${preset}`} className="rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">Category movement</h2>
        <div className="space-y-3">
          {movement.length === 0 && <p className="text-sm italic text-[var(--text-muted)]">No category movement for this period.</p>}
          {movement.map((row, index) => {
            const width = Math.min(100, row.before === 0 ? 100 : (row.now / Math.max(row.now, row.before)) * 100)
            const label = row.change === null ? 'New' : `${row.change > 0 ? '+' : ''}${row.change}%`
            return (
              <div key={row.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-[var(--text-main)]">{row.name}</span>
                  <span className="font-bold text-[var(--text-muted)]">{label}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--item-bg)]">
                  <div className="h-full origin-left animate-bar-fill rounded-full" style={{ width: `${width}%`, backgroundColor: row.color, animationDelay: `${index * 40}ms` }} />
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
