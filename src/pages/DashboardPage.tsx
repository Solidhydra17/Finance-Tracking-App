import { useState, useEffect } from 'react';
import { DonutChart } from '@/components/charts';
import { useDashboard } from '@/hooks';
import { useUIStore } from '@/store';
import { Icon } from '@/components/ui';
import { centsToDisplay } from '@/lib/money';
import { Link } from 'react-router-dom';
import { ProgressBar } from '@/components/ui';
import { budgetEngine, type PlannedVsActual } from '@/domain/budget/budgetEngine';
import { useBudget } from '@/hooks';
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
  const { filters, setFilters, showLoans, isFirstLoad } = useUIStore();
  const { data } = useDashboard(filters, showLoans);
  const { plan, items } = useBudget();
  const [pva, setPva] = useState<Map<number, PlannedVsActual>>(new Map());

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

  // Show loading screen only on the very first load when no data exists yet
  if (isFirstLoad && !data) {
    return <FunnyLoadingScreen />;
  }

  if (!data) return null;

  const currentPreset = filters.dateRange.preset;

  const chartData = data.categoryBreakdown.map((c: any) => ({
    label: c.categoryName,
    value: c.total,
    color: c.color,
  }));

  return (
    <div id="page-dashboard" className="px-4 space-y-6">
      {/* App Header */}
      <header id="dashboard-header" className="pt-4">
        <h1 className="text-3xl font-extrabold text-midblue dark:text-white tracking-wider">KURIPOT</h1>
      </header>

      {/* Balance Card */}
      <div id="card-balance" className="bg-midblue rounded-3xl p-6 shadow-medium border-2 border-midblue">
        <div className="mb-6">
          <p className="text-xs font-bold text-white uppercase tracking-widest mb-1">Remaining Balance</p>
          <h2 className={`pt-2 font-black text-white whitespace-nowrap overflow-hidden transition-all duration-300 ${centsToDisplay(data.summary.totalBalance).length > 15 ? 'text-2xl' :
              centsToDisplay(data.summary.totalBalance).length > 12 ? 'text-3xl' : 'text-4xl'
            }`}>
            {centsToDisplay(data.summary.totalBalance)}
          </h2>
        </div>

        <div id="balance-details" className="flex justify-between items-center pt-4 border-t border-white/20">
          <div id="balance-income">
            <p className="text-[10px] font-bold text-success-400 uppercase mb-0.5">Income</p>
            <p className="text-lg font-bold text-success-400">
              {centsToDisplay(data.summary.income)}
            </p>
          </div>
          <div id="balance-expense" className="text-right">
            <p className="text-[10px] font-bold text-danger-400 uppercase mb-0.5">Expense</p>
            <p className="text-lg font-bold text-danger-400">
              {centsToDisplay(data.summary.expenses)}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div id="dashboard-filters" className="flex gap-2 py-2">
        <button 
          id="filter-week" 
          onClick={() => handlePresetChange('week')}
          className={`flex-1 py-2 px-4 rounded-xl border-2 border-midblue font-bold text-sm transition-all ${
            currentPreset === 'week' 
            ? 'bg-midblue text-white shadow-soft scale-105' 
            : 'bg-[var(--card-bg)] text-midblue dark:text-gray-400 hover:bg-midblue/5'
          }`}
        >
          Week
        </button>
        <button 
          id="filter-month" 
          onClick={() => handlePresetChange('month')}
          className={`flex-1 py-2 px-4 rounded-xl border-2 border-midblue font-bold text-sm transition-all ${
            currentPreset === 'month' 
            ? 'bg-midblue text-white shadow-soft scale-105' 
            : 'bg-[var(--card-bg)] text-midblue dark:text-gray-400 hover:bg-midblue/5'
          }`}
        >
          Month
        </button>
        <button 
          id="filter-year" 
          onClick={() => handlePresetChange('year')}
          className={`flex-1 py-2 px-4 rounded-xl border-2 border-midblue font-bold text-sm transition-all ${
            currentPreset === 'year' 
            ? 'bg-midblue text-white shadow-soft scale-105' 
            : 'bg-[var(--card-bg)] text-midblue dark:text-gray-400 hover:bg-midblue/5'
          }`}
        >
          Year
        </button>
      </div>

      {/* Graphs Section */}
      <div id="section-breakdown" className="bg-[var(--card-bg)] rounded-3xl p-6 border-2 border-[var(--card-border)] min-h-[300px]">
        <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-6">Spending Breakdown</h3>
        {chartData.length > 0 ? (
          <div className="flex flex-col items-center justify-center space-y-8">
            <DonutChart data={chartData} size={200} strokeWidth={25} />
            <div className="w-full space-y-3">
              {data.categoryBreakdown.slice(0, 4).map((cat: any) => (
                <div key={cat.categoryId} id={`breakdown-item-${cat.categoryId}`} className="flex items-center justify-between p-3 bg-[var(--item-bg)] border border-[var(--card-border)] rounded-2xl">
                  <div className="flex items-center gap-3">
                    <Icon name={cat.icon} className="w-6 h-6" style={{ color: cat.color }} />
                    <span className="text-sm font-bold text-[var(--text-main)]">{cat.categoryName}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-midblue dark:text-white">{centsToDisplay(cat.total)}</p>
                    <p className="text-[10px] font-bold text-[var(--text-muted)]">{cat.percentage.toFixed(0)}%</p>
                  </div>
                </div>
              ))}
              <div className="pt-2">
                <Link 
                  id="btn-view-all-transactions"
                  to="/transactions" 
                  className="w-full flex items-center justify-center py-4 rounded-2xl border-2 border-dashed border-[var(--card-border)] bg-[var(--item-bg)] text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest hover:border-midblue hover:text-midblue transition-all"
                >
                  See more
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-[var(--text-muted)] italic">
            No spending data yet
          </div>
        )}
      </div>

      {/* Budget Status Section */}
      {pva.size > 0 && (
        <div id="section-budget-status" className="bg-[var(--card-bg)] rounded-3xl p-6 border-2 border-[var(--card-border)]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider">Budget Status</h3>
          </div>
          <div className="space-y-4">
            {Array.from(pva.entries())
              .map(([categoryId, status]) => {
                const percentage = status.plannedCents > 0 ? (status.actualCents / status.plannedCents) * 100 : 0;
                return { categoryId, status, percentage };
              })
              .filter(item => item.percentage >= 80) // Only Nearing (>=80%) or Over budget
              .sort((a, b) => b.percentage - a.percentage) // Top utilization first
              .slice(0, 3) // Limit to top 3 to avoid clutter
              .map(item => {
                // Find category name from data.categoryBreakdown if possible, or fallback
                const categoryData = data.categoryBreakdown.find((c: any) => c.categoryId === item.categoryId);
                const categoryName = categoryData ? categoryData.categoryName : 'Category';
                return (
                  <div key={item.categoryId} className="space-y-1">
                    <div className="flex justify-between items-end text-sm">
                      <span className="font-bold text-[var(--text-main)]">{categoryName}</span>
                      <div className="text-right">
                        <span className="font-black text-[var(--text-main)]">{centsToDisplay(item.status.actualCents)}</span>
                        <span className="font-bold text-[var(--text-muted)] text-xs"> / {centsToDisplay(item.status.plannedCents)}</span>
                      </div>
                    </div>
                    <ProgressBar percentage={item.percentage} height={10} />
                    <p className="text-[10px] font-bold text-[var(--text-muted)] text-right">{item.percentage.toFixed(0)}%</p>
                  </div>
                );
              })}
              {Array.from(pva.values()).filter(s => s.plannedCents > 0 && (s.actualCents / s.plannedCents) * 100 >= 80).length === 0 && (
                <div className="text-center py-4 text-[var(--text-muted)] italic text-sm">
                  All budget categories are under 80% utilization. Great job!
                </div>
              )}
          </div>
          <div className="pt-4 mt-2">
            <Link 
              to="/budget-planning" 
              className="w-full flex items-center justify-center py-4 rounded-2xl bg-midblue text-white text-xs font-bold uppercase tracking-widest hover:bg-midblue/90 shadow-soft hover:shadow-medium transition-all"
            >
              View Budget Planner
            </Link>
          </div>
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
