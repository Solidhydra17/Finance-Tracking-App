import { useState, useEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useDashboard } from '@/hooks';
import { useUIStore, useWalletStore, useLoanStore } from '@/store';
import { Icon } from '@/components/ui';
import { centsToDisplay } from '@/lib/money';
import { calculateBalances } from '@/lib/balances';
import { Link } from 'react-router-dom';
import { budgetEngine, type PlannedVsActual } from '@/domain/budget/budgetEngine';
import { useBudget } from '@/hooks';
import { AiInsightCard } from '@/components/dashboard/AiInsightCard';
import { BudgetRings } from '@/components/charts/BudgetRings';
import { SpendingBubbles } from '@/components/charts/SpendingBubbles';
import { EyeIcon, EyeSlashIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
const LOADING_MESSAGES = [
  "Nagbibilang ng natitirang barya…",
  "Fetching data… at pati utang mo",
  "Balancing… hindi lang budget, pati emotions",
  "Manifesting: Sana dumami pera habang naglo-load",
  "Analyzing expenses… result: petsa de peligro"
];

const FunnyLoadingScreen = () => {
  const [messageIndex, setMessageIndex] = useState(() => Math.floor(Math.random() * LOADING_MESSAGES.length));
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Message rotation
    const messageInterval = setInterval(() => {
      setMessageIndex(prev => {
        let next;
        do {
          next = Math.floor(Math.random() * LOADING_MESSAGES.length);
        } while (next === prev && LOADING_MESSAGES.length > 1);
        return next;
      });
    }, 2000);

    // Simulated progress bar (3 seconds total)
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + 1;
      });
    }, 50);

    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-[var(--bg-color)] flex flex-col items-center justify-center p-8 z-50">
      <div className="w-full max-w-xs space-y-8 text-center">
        {/* Animated Icon/Logo placeholder */}
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-midblue/10 rounded-3xl flex items-center justify-center animate-bounce">
            <Icon name="BanknotesIcon" className="w-8 h-8 text-midblue" />
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-black text-midblue dark:text-white tracking-tight">
            KURIPOT
          </h2>

          {/* Progress Bar Container */}
          <div className="w-full h-2 bg-[var(--item-bg)] rounded-full overflow-hidden border border-[var(--card-border)]">
            <div
              className="h-full bg-midblue transition-all duration-300 ease-out shadow-[0_0_10px_rgba(40,92,204,0.3)]"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-sm font-bold text-[var(--text-muted)] animate-pulse min-h-[40px] flex items-center justify-center px-4">
            {LOADING_MESSAGES[messageIndex]}
          </p>
        </div>
      </div>
    </div>
  );
};

import { formatDateLocal, getWeekRange, getMonthRange, getYearRange } from '@/lib/date';

export const DashboardPage: React.FC = () => {
  const { filters, setFilters, showLoans, isFirstLoad, balancesHidden, toggleBalancesHidden } = useUIStore(useShallow(state => ({
    filters: state.filters,
    setFilters: state.setFilters,
    showLoans: state.showLoans,
    isFirstLoad: state.isFirstLoad,
    balancesHidden: state.balancesHidden,
    toggleBalancesHidden: state.toggleBalancesHidden,
  })));
  const { data } = useDashboard(filters, showLoans);
  const { plan, items } = useBudget();
  const { totalWalletBalance, totalCreditDebt, totalWalletLoanDebt, fetchAccounts } = useWalletStore(useShallow(state => ({
    totalWalletBalance: state.totalWalletBalance,
    totalCreditDebt: state.totalCreditDebt,
    totalWalletLoanDebt: state.totalWalletLoanDebt,
    fetchAccounts: state.fetchAccounts,
  })));
  const { totalOwedToYou, totalYouOwe, fetchLoans } = useLoanStore(useShallow(state => ({
    totalOwedToYou: state.totalOwedToYou,
    totalYouOwe: state.totalYouOwe,
    fetchLoans: state.fetchLoans,
  })));
  const { displayedWalletTotal, projectedBalance } = calculateBalances({
    totalWalletBalance,
    totalCreditDebt,
    walletLoanDebt: totalWalletLoanDebt,
    peerLoanDebt: totalYouOwe,
    totalOwedToYou,
  });
  const [pva, setPva] = useState<Map<number, PlannedVsActual>>(new Map());

  useEffect(() => {
    fetchAccounts();
    fetchLoans();
  }, [fetchAccounts, fetchLoans]);

  useEffect(() => {
    if (items && items.length > 0) {
      budgetEngine.getPlannedVsActual(items, plan?.workDaysPerWeek || 5).then(setPva);
    }
  }, [items, plan?.workDaysPerWeek]);

  const handlePresetChange = (preset: 'week' | 'month' | 'year') => {
    const now = new Date();
    let range;

    if (preset === 'week') range = getWeekRange(now);
    else if (preset === 'month') range = getMonthRange(now);
    else range = getYearRange(now);

    setFilters({
      dateRange: {
        preset,
        startDate: formatDateLocal(range.start),
        endDate: formatDateLocal(range.end)
      }
    });
  };

  const rank = (preset: string) => preset === 'week' ? 0 : preset === 'year' ? 2 : 1
  const previousPreset = useRef(filters.dateRange.preset);
  const periodDirection = rank(filters.dateRange.preset) >= rank(previousPreset.current) ? 1 : -1;
  useEffect(() => {
    previousPreset.current = filters.dateRange.preset;
  }, [filters.dateRange.preset]);

  const money = (cents: number) => (balancesHidden ? '••••' : centsToDisplay(cents));
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const budgetRings = useMemo(() => {
    if (!data) return [];
    return Array.from(pva.entries())
      .filter(([, status]) => status.plannedCents > 0)
      .map(([categoryId, status]) => {
        const categoryData = data.categoryBreakdown.find((c) => c.categoryId === categoryId);
        return {
          id: String(categoryId),
          name: categoryData?.categoryName ?? 'Category',
          percentage: (status.actualCents / status.plannedCents) * 100,
          color: categoryData?.color ?? '#285ccc',
          actual: status.actualCents,
          plannedCents: status.plannedCents,
        };
      });
  }, [data, pva]);
  const budgetSpent = budgetRings.reduce((sum, row) => sum + row.actual, 0);

  // Show loading screen only on the very first load when no data exists yet
  if (isFirstLoad && !data) {
    return <FunnyLoadingScreen />;
  }

  if (!data) return null;

  const currentPreset = filters.dateRange.preset;

  return (
    <div id="page-dashboard" className="px-4 space-y-6">
      {/* App Header */}
      <header id="dashboard-header" className="flex items-end justify-between pt-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-midblue dark:text-white">{greeting}</h1>
          <p className="mt-1 text-xs font-bold uppercase tracking-widest text-gray-400">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </header>

      <div id="card-balance" className="rounded-3xl border-2 border-midblue bg-midblue p-6 shadow-medium">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-white">Projected Balance</p>
            <h2 className="overflow-hidden whitespace-nowrap pt-2 text-4xl font-black text-white">
              {money(projectedBalance)}
            </h2>
            <p className="mt-1 text-xs font-medium text-blue-200/70">
              Total Wallet Balance: {money(displayedWalletTotal)}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleBalancesHidden}
            aria-label={balancesHidden ? 'Show balances' : 'Hide balances'}
            aria-pressed={balancesHidden}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-white"
          >
            {balancesHidden ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
          </button>
        </div>

        <div
          key={currentPreset}
          className="flex animate-period-in items-center justify-between border-t border-white/20 pt-4"
          style={{ ['--period-shift' as string]: `${periodDirection * 14}px` }}
        >
          <div id="balance-income">
            <p className="mb-0.5 text-[10px] font-bold uppercase text-success-400">This Period Income</p>
            <p className="text-lg font-bold text-success-400">{money(data.summary.income)}</p>
          </div>
          <div id="balance-expense" className="text-right">
            <p className="mb-0.5 text-[10px] font-bold uppercase text-danger-400">This Period Expenses</p>
            <p className="text-lg font-bold text-danger-400">{money(data.summary.expenses)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Link to="/budget-planning" className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] text-xs font-bold text-[var(--text-main)]">
          <Icon name="DocumentChartBarIcon" className="h-5 w-5 text-midblue" />
          Budget
        </Link>
        <Link to="/insight" className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] text-xs font-bold text-[var(--text-main)]">
          <Icon name="SparklesIcon" className="h-5 w-5 text-midblue" />
          Insight
        </Link>
        <Link to="/payment-planner" className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] text-xs font-bold text-[var(--text-main)]">
          <CalendarDaysIcon className="h-5 w-5 text-midblue" />
          Payment Planner
        </Link>
      </div>

      <AiInsightCard
        data={data}
        periodPreset={currentPreset}
        pva={pva}
        projectedBalance={projectedBalance}
        creditDebt={totalCreditDebt}
        youOwe={totalYouOwe}
        presentation="home"
      />

      <div id="dashboard-filters" className="flex gap-2 py-2">
        {(['week', 'month', 'year'] as const).map((preset) => (
          <button
            key={preset}
            id={`filter-${preset}`}
            type="button"
            onClick={() => handlePresetChange(preset)}
            className={`flex-1 rounded-xl border-2 border-midblue px-4 py-2 text-sm font-bold capitalize transition-all ${
              currentPreset === preset
                ? 'scale-105 bg-midblue text-white shadow-soft'
                : 'bg-[var(--card-bg)] text-midblue hover:bg-midblue/5 dark:text-gray-400'
            }`}
          >
            {preset}
          </button>
        ))}
      </div>

      <div
        id="section-breakdown"
        key={`spend-${currentPreset}`}
        className="animate-period-in rounded-3xl border-2 border-[var(--card-border)] bg-[var(--card-bg)] p-6"
        style={{ ['--period-shift' as string]: `${periodDirection * 14}px` }}
      >
        <h3 className="mb-6 text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">Spending this period</h3>
        <SpendingBubbles
          items={data.categoryBreakdown.map((cat) => ({
            id: String(cat.categoryId),
            name: cat.categoryName,
            color: cat.color,
            total: cat.total,
            percentage: cat.percentage,
          }))}
          hidden={balancesHidden}
          period={currentPreset}
        />
        {data.categoryBreakdown.length > 0 && (
          <Link
            id="btn-view-all-transactions"
            to="/transactions"
            className="mt-4 flex w-full items-center justify-center rounded-2xl border-2 border-dashed border-[var(--card-border)] bg-[var(--item-bg)] py-4 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]"
          >
            See more
          </Link>
        )}
      </div>

      {budgetRings.length > 0 && (
        <div id="section-budget-status" className="rounded-3xl border-2 border-[var(--card-border)] bg-[var(--card-bg)] p-6">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">Budget · This month</h3>
          <BudgetRings rows={budgetRings} spentCents={budgetSpent} hidden={balancesHidden} />
          <div className="mt-4 space-y-2">
            {budgetRings.map((row) => (
              <div key={row.id} className="flex items-center justify-between text-sm">
                <span className="font-bold text-[var(--text-main)]">{row.name}</span>
                <span className="font-black text-[var(--text-main)]">
                  {money(row.actual)}
                  <span className="text-xs font-bold text-[var(--text-muted)]"> / {money(row.plannedCents)}</span>
                </span>
              </div>
            ))}
          </div>
          <Link
            to="/budget-planning"
            className="mt-4 flex w-full items-center justify-center rounded-2xl bg-midblue py-4 text-xs font-bold uppercase tracking-widest text-white"
          >
            Open budget planner
          </Link>
        </div>
      )}

      {/* Planning Section (Legacy fallback if Budget Plan is empty) */}
      {items.length === 0 && (
        <div id="section-planning" className="bg-[var(--card-bg)] rounded-3xl p-6 border-2 border-[var(--card-border)]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider">Plan Ahead</h3>
            <Icon name="DocumentChartBarIcon" className="w-5 h-5 text-midblue" />
          </div>
          <p className="text-xs font-bold text-[var(--text-muted)] mb-4">Allocate your salary before you spend it to avoid deficits and maximize savings.</p>
          <Link
            to="/budget-planning"
            className="w-full flex items-center justify-center py-4 rounded-2xl bg-midblue text-white text-xs font-bold uppercase tracking-widest hover:bg-midblue/90 shadow-soft hover:shadow-medium transition-all"
          >
            Budget Planning
          </Link>
        </div>
      )}

    </div>
  );
};
