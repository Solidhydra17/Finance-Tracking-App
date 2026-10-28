import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'
import { ArrowLeftIcon, ArrowTrendingDownIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline'
import { AiInsightCard } from '@/components/dashboard/AiInsightCard'
import { useBudget, useCategories, useDashboard } from '@/hooks'
import { centsToDisplay } from '@/lib/money'
import { formatDateLocal, getCurrentLocalDate, getMonthRange, getWeekRange, getYearRange } from '@/lib/date'
import { transactionRepository } from '@/storage'
import { useLoanStore, useUIStore, useWalletStore } from '@/store'
import { budgetEngine, type PlannedVsActual } from '@/domain/budget/budgetEngine'
import { calculateBalances } from '@/lib/balances'
import type { Transaction } from '@/types'

type Preset = 'week' | 'month' | 'year'
type FlowMode = 'overall' | 'expense' | 'income'
type Bucket = { label: string; start: string; end: string; income: number; expense: number }

const FLOW_MODES: Array<{ id: FlowMode; label: string }> = [
  { id: 'overall', label: 'Overall' },
  { id: 'expense', label: 'Expense' },
  { id: 'income', label: 'Income' },
]

const flowColor = (mode: FlowMode) => (
  mode === 'income' ? '#16a34a' : mode === 'expense' ? '#ef4444' : '#285ccc'
)

const bucketValue = (bucket: Bucket, mode: FlowMode) => (
  mode === 'income' ? bucket.income : mode === 'expense' ? bucket.expense : bucket.income - bucket.expense
)

const periodTotal = (rows: Transaction[], mode: FlowMode) => {
  let income = 0
  let expense = 0
  rows.forEach((row) => {
    if (row.deletedAt || row.type === 'fund_transfer' || row.type === 'credit_payment') return
    if (row.type === 'income') income += row.amount
    if (row.type === 'expense') expense += row.amount
  })
  if (mode === 'income') return income
  if (mode === 'expense') return expense
  return income - expense
}

const changePercent = (current: number, previous: number) => {
  if (previous === 0) return current === 0 ? 0 : null
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10
}

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

const smoothArea = (points: Array<{ x: number; y: number }>, baseline: number) => {
  const line = smoothLine(points)
  if (!line || points.length === 0) return ''
  const first = points[0]
  const last = points[points.length - 1]
  return `${line} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`
}

const FLOW_CHART = { left: 40, right: 312, top: 12, bottom: 118, width: 272, height: 106 }

const niceCeilCents = (cents: number) => {
  if (cents <= 0) return 10000
  const pesos = cents / 100
  const magnitude = 10 ** Math.floor(Math.log10(pesos))
  const normalized = pesos / magnitude
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return Math.round(nice * magnitude * 100)
}

const axisMoney = (cents: number, hidden: boolean) => {
  if (hidden) return '••'
  const pesos = cents / 100
  if (pesos >= 1000) {
    const value = pesos / 1000
    const text = value >= 10 ? value.toFixed(0) : value.toFixed(1).replace(/\.0$/, '')
    return `₱${text}k`
  }
  return `₱${Math.round(pesos)}`
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
  const [flowMode, setFlowMode] = useState<FlowMode>('overall')
  const [categoryView, setCategoryView] = useState<'graph' | 'list'>('graph')

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
  const seriesValues = buckets.map((bucket) => bucketValue(bucket, flowMode))
  const seriesMin = Math.min(0, ...seriesValues)
  const seriesMax = Math.max(0, ...seriesValues)
  const flowBound = niceCeilCents(Math.max(Math.abs(seriesMin), Math.abs(seriesMax), 1))
  const yMin = flowMode === 'overall' && seriesMin < 0 ? -flowBound : 0
  const yMax = flowBound
  const flowX = (index: number) => (
    buckets.length === 1
      ? (FLOW_CHART.left + FLOW_CHART.right) / 2
      : FLOW_CHART.left + (index / (buckets.length - 1)) * FLOW_CHART.width
  )
  const flowY = (cents: number) => FLOW_CHART.bottom - ((cents - yMin) / (yMax - yMin || 1)) * FLOW_CHART.height
  const flowPoints = buckets.map((bucket, index) => ({
    x: flowX(index),
    y: flowY(bucketValue(bucket, flowMode)),
  }))
  const zeroY = flowY(0)
  const yTicks = flowMode === 'overall' && yMin < 0
    ? [yMax, 0, yMin].map((value) => ({ value, y: flowY(value) }))
    : [1, 0.5, 0].map((ratio) => {
      const value = Math.round(yMax * ratio)
      return { value, y: flowY(value) }
    })
  const activeColor = flowColor(flowMode)
  const currentFlowTotal = periodTotal(currentTx, flowMode)
  const previousFlowTotal = periodTotal(previousTx, flowMode)
  const flowChange = changePercent(currentFlowTotal, previousFlowTotal)
  const flowTotalLabel = flowMode === 'income' ? 'Income' : flowMode === 'expense' ? 'Expenses' : 'Net'

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

  const categorySeries = useMemo(() => {
    return movement.map((row) => {
      const values = buckets.map((bucket) => {
        let total = 0
        currentTx.forEach((transaction) => {
          if (transaction.deletedAt || transaction.categoryId !== row.id) return
          if (transaction.type !== 'expense' && transaction.type !== 'income') return
          if (transaction.date < bucket.start || transaction.date > bucket.end) return
          total += transaction.amount
        })
        return total
      })
      return { ...row, values }
    })
  }, [movement, buckets, currentTx])

  const categoryMax = niceCeilCents(Math.max(1, ...categorySeries.flatMap((series) => series.values)))
  const categoryY = (cents: number) => FLOW_CHART.bottom - (cents / categoryMax) * FLOW_CHART.height
  const categoryTicks = [1, 0.5, 0].map((ratio) => {
    const value = Math.round(categoryMax * ratio)
    return { value, y: categoryY(value) }
  })

  const money = (cents: number) => (balancesHidden ? '••••' : centsToDisplay(cents))
  const today = getCurrentLocalDate()
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
          {buckets.map((bucket, index) => {
            const isCurrent = today >= bucket.start && today <= bucket.end
            return (
              <div key={bucket.label} className="flex h-full flex-1 flex-col justify-end gap-2">
                <div
                  className={`w-full origin-bottom animate-bar-rise rounded-t-md ${isCurrent ? 'bg-midblue' : 'bg-midblue/35'}`}
                  style={{ height: bucket.expense === 0 ? '2px' : `${Math.max(8, (bucket.expense / maxBar) * 100)}%`, animationDelay: `${index * 45}ms` }}
                />
                <span className={`truncate text-center text-[10px] font-bold ${isCurrent ? 'text-midblue' : 'text-[var(--text-muted)]'}`}>{bucket.label}</span>
              </div>
            )
          })}
        </div>
      </section>

      <section key={`flow-${preset}-${flowMode}`} className="rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">Cash flow</h2>
          <div className="flex shrink-0 gap-1 rounded-full bg-[var(--item-bg)] p-1">
            {FLOW_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setFlowMode(mode.id)}
                className={`min-h-8 rounded-full px-2.5 text-[11px] font-bold transition-colors ${
                  flowMode === mode.id
                    ? 'bg-white text-gray-900 shadow-sm dark:bg-white dark:text-gray-900'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
        <svg viewBox="0 0 320 148" className="w-full text-[var(--text-muted)]" style={{ aspectRatio: '320 / 148' }} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`${flowMode} cash flow over the selected period`}>
          <defs>
            <linearGradient id="cashflow-active-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={activeColor} stopOpacity="0.32" />
              <stop offset="100%" stopColor={activeColor} stopOpacity="0" />
            </linearGradient>
          </defs>
          {yTicks.map((tick) => (
            <g key={`${tick.value}-${tick.y}`}>
              <line x1={FLOW_CHART.left} x2={FLOW_CHART.right} y1={tick.y} y2={tick.y} stroke="currentColor" strokeOpacity="0.22" strokeWidth="1" strokeDasharray={tick.value === 0 && yMin < 0 ? '0' : '3 3'} />
              <text x={0} y={tick.y + 2.5} textAnchor="start" className="fill-current text-[7px] font-semibold">{axisMoney(tick.value, balancesHidden)}</text>
            </g>
          ))}
          <path d={smoothArea(flowPoints, zeroY)} fill="url(#cashflow-active-fill)" stroke="none" />
          <path d={smoothLine(flowPoints)} pathLength={1} fill="none" stroke={activeColor} strokeWidth="1.25" strokeLinecap="round" className="animate-line-draw" />
          {buckets.map((bucket, index) => {
            const isCurrent = today >= bucket.start && today <= bucket.end
            return (
              <text
                key={bucket.label}
                x={flowX(index)}
                y={138}
                textAnchor="middle"
                className={`text-[7px] font-semibold ${isCurrent ? 'fill-midblue' : 'fill-current'}`}
              >
                {bucket.label}
              </text>
            )
          })}
        </svg>
        <div className="mt-1 flex items-center justify-between gap-3">
          <p className="text-[11px] font-bold" style={{ color: activeColor }}>
            {flowTotalLabel} {money(currentFlowTotal)}
          </p>
          <div
            className={`inline-flex min-h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-[11px] font-bold ${
              flowChange === null
                ? 'bg-[var(--item-bg)] text-[var(--text-muted)]'
                : flowChange > 0
                  ? 'bg-success-500/15 text-success-600'
                  : flowChange < 0
                    ? 'bg-danger-500/15 text-danger-500'
                    : 'bg-[var(--item-bg)] text-[var(--text-muted)]'
            }`}
          >
            {flowChange === null ? (
              'New'
            ) : (
              <>
                {flowChange > 0 ? <ArrowTrendingUpIcon className="h-3.5 w-3.5" /> : flowChange < 0 ? <ArrowTrendingDownIcon className="h-3.5 w-3.5" /> : null}
                {`${flowChange > 0 ? '+' : ''}${flowChange}%`}
              </>
            )}
          </div>
        </div>
      </section>

      <section key={`move-${preset}`} className="rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">Category movement</h2>
          <div className="grid shrink-0 grid-cols-2 gap-1 rounded-2xl bg-[var(--item-bg)] p-1" role="group" aria-label="Category movement view">
            <button
              type="button"
              aria-pressed={categoryView === 'graph'}
              onClick={() => setCategoryView('graph')}
              className={`min-h-9 rounded-xl px-3 text-[11px] font-bold transition-colors ${categoryView === 'graph' ? 'bg-midblue text-white' : 'text-[var(--text-muted)]'}`}
            >
              Graph
            </button>
            <button
              type="button"
              aria-pressed={categoryView === 'list'}
              onClick={() => setCategoryView('list')}
              className={`min-h-9 rounded-xl px-3 text-[11px] font-bold transition-colors ${categoryView === 'list' ? 'bg-midblue text-white' : 'text-[var(--text-muted)]'}`}
            >
              List
            </button>
          </div>
        </div>

        {movement.length === 0 && <p className="text-sm italic text-[var(--text-muted)]">No category movement for this period.</p>}

        {categoryView === 'graph' && movement.length > 0 && (
          <div className="space-y-3">
            <svg viewBox="0 0 320 148" className="w-full text-[var(--text-muted)]" style={{ aspectRatio: '320 / 148' }} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Category totals over the selected period">
              <defs>
                {categorySeries.map((series) => (
                  <linearGradient key={`fill-${series.id}`} id={`category-fill-${series.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={series.color} stopOpacity="0.22" />
                    <stop offset="100%" stopColor={series.color} stopOpacity="0" />
                  </linearGradient>
                ))}
              </defs>
              {categoryTicks.map((tick) => (
                <g key={`cat-tick-${tick.value}`}>
                  <line x1={FLOW_CHART.left} x2={FLOW_CHART.right} y1={tick.y} y2={tick.y} stroke="currentColor" strokeOpacity="0.22" strokeWidth="1" strokeDasharray="3 3" />
                  <text x={0} y={tick.y + 2.5} textAnchor="start" className="fill-current text-[7px] font-semibold">{axisMoney(tick.value, balancesHidden)}</text>
                </g>
              ))}
              {categorySeries.map((series) => {
                const points = series.values.map((value, index) => ({ x: flowX(index), y: categoryY(value) }))
                return (
                  <path
                    key={`area-${series.id}`}
                    d={smoothArea(points, FLOW_CHART.bottom)}
                    fill={`url(#category-fill-${series.id})`}
                    stroke="none"
                  />
                )
              })}
              {categorySeries.map((series, index) => {
                const points = series.values.map((value, pointIndex) => ({ x: flowX(pointIndex), y: categoryY(value) }))
                return (
                  <g key={`series-${series.id}`}>
                    <path
                      d={smoothLine(points)}
                      pathLength={1}
                      fill="none"
                      stroke={series.color}
                      strokeWidth="1.25"
                      strokeLinecap="round"
                      className="animate-line-draw"
                      style={{ animationDelay: `${index * 60}ms` }}
                    />
                    {points.map((point, pointIndex) => (
                      <circle
                        key={`dot-${series.id}-${pointIndex}`}
                        cx={point.x}
                        cy={point.y}
                        r="2"
                        fill={series.color}
                        stroke="var(--card-bg)"
                        strokeWidth="0.75"
                      />
                    ))}
                  </g>
                )
              })}
              {buckets.map((bucket, index) => {
                const isCurrent = today >= bucket.start && today <= bucket.end
                return (
                  <text
                    key={`cat-x-${bucket.label}`}
                    x={flowX(index)}
                    y={138}
                    textAnchor="middle"
                    className={`text-[7px] font-semibold ${isCurrent ? 'fill-midblue' : 'fill-current'}`}
                  >
                    {bucket.label}
                  </text>
                )
              })}
            </svg>
            <div className="flex flex-wrap gap-x-3 gap-y-2">
              {categorySeries.map((series) => (
                <div key={`legend-${series.id}`} className="flex min-h-8 items-center gap-1.5">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: series.color }} aria-hidden="true" />
                  <span className="text-[11px] font-bold text-[var(--text-main)]">{series.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {categoryView === 'list' && movement.length > 0 && (
          <div className="space-y-3">
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
        )}
      </section>
    </div>
  )
}
