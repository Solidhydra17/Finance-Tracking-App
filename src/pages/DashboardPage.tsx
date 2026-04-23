import { useState, useEffect } from 'react';
import { DonutChart } from '@/components/charts';
import { useDashboard } from '@/hooks';
import { useUIStore } from '@/store';
import { Icon } from '@/components/ui';
import { centsToDisplay } from '@/lib/money';
import { Link } from 'react-router-dom';
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
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center p-8 z-50">
      <div className="w-full max-w-xs space-y-8 text-center">
        {/* Animated Icon/Logo placeholder */}
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-midblue/10 rounded-3xl flex items-center justify-center animate-bounce">
            <Icon name="BanknotesIcon" className="w-8 h-8 text-midblue" />
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-black text-midblue tracking-tight">
            KURIPOT
          </h2>
          
          {/* Progress Bar Container */}
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-midblue transition-all duration-300 ease-out shadow-[0_0_10px_rgba(40,92,204,0.3)]"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-sm font-bold text-gray-500 animate-pulse min-h-[40px] flex items-center justify-center px-4">
            {LOADING_MESSAGES[messageIndex]}
          </p>
        </div>
      </div>
    </div>
  );
};

export const DashboardPage: React.FC = () => {
  const { filters, showLoans, isFirstLoad } = useUIStore();
  const { data, isLoading } = useDashboard(filters, showLoans);

  if (isFirstLoad || (isLoading && !data)) {
    return <FunnyLoadingScreen />;
  }

  if (!data) return null;

  const chartData = data.categoryBreakdown.map((c: any) => ({
    label: c.categoryName,
    value: c.total,
    color: c.color,
  }));

  return (
    <div id="page-dashboard" className="px-4 space-y-6">
      {/* App Header */}
      <header id="dashboard-header" className="pt-4">
        <h1 className="text-3xl font-extrabold text-midblue tracking-wider">KURIPOT</h1>
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
        <button id="filter-week" className="flex-1 py-2 px-4 rounded-xl border-2 border-midblue text-midblue font-bold text-sm bg-white hover:bg-midblue/5 transition-colors">
          Week
        </button>
        <button id="filter-month" className="flex-1 py-2 px-4 rounded-xl border-2 border-midblue bg-midblue text-white font-bold text-sm shadow-soft">
          Month
        </button>
        <button id="filter-year" className="flex-1 py-2 px-4 rounded-xl border-2 border-midblue text-midblue font-bold text-sm bg-white hover:bg-midblue/5 transition-colors">
          Year
        </button>
      </div>

      {/* Graphs Section */}
      <div id="section-breakdown" className="bg-white rounded-3xl p-6 border-2 border-gray-100 min-h-[300px]">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6">Spending Breakdown</h3>
        {chartData.length > 0 ? (
          <div className="flex flex-col items-center justify-center space-y-8">
            <DonutChart data={chartData} size={200} strokeWidth={25} />
            <div className="w-full space-y-3">
              {data.categoryBreakdown.slice(0, 4).map((cat: any) => (
                <div key={cat.categoryId} id={`breakdown-item-${cat.categoryId}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <Icon name={cat.icon} className="w-6 h-6" style={{ color: cat.color }} />
                    <span className="text-sm font-bold text-gray-700">{cat.categoryName}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-midblue">{centsToDisplay(cat.total)}</p>
                    <p className="text-[10px] font-bold text-gray-400">{cat.percentage.toFixed(0)}%</p>
                  </div>
                </div>
              ))}
              <div className="pt-2">
                <Link 
                  id="btn-view-all-transactions"
                  to="/transactions" 
                  className="w-full flex items-center justify-center py-3 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 text-xs font-bold uppercase tracking-widest hover:border-midblue hover:text-midblue transition-all"
                >
                  See more
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 italic">
            No spending data yet
          </div>
        )}
      </div>
    </div>
  );
};
