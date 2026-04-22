import React from 'react';
import { DonutChart } from '@/components/charts';
import { Card, CardBody, Badge } from '@/components/ui';
import { useDashboard } from '@/hooks';
import { useUIStore } from '@/store';
import { Icon } from '@/components/ui';
import { centsToDisplay } from '@/lib/money';

export const DashboardPage: React.FC = () => {
  const { filters, showLoans } = useUIStore();
  const { data, isLoading } = useDashboard(filters, showLoans);

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon name="ArrowPathIcon" className="w-8 h-8 animate-spin text-midblue" />
      </div>
    );
  }

  const chartData = data.categoryBreakdown.map((c) => ({
    label: c.categoryName,
    value: c.total,
    color: c.color,
  }));

  return (
    <div className="px-4 space-y-6 pb-24">
      {/* App Header */}
      <header className="py-4">
        <h1 className="text-3xl font-extrabold text-midblue tracking-wider">PITAKA</h1>
      </header>

      {/* Balance Card */}
      <div className="bg-midblue rounded-3xl p-6 shadow-medium border-2 border-midblue">
        <div className="mb-6">
          <p className="text-xs font-bold text-white uppercase tracking-widest mb-1">Remaining Balance</p>
          <h2 className="text-4xl font-black text-white">
            {centsToDisplay(data.summary.totalBalance)}
          </h2>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-white/20">
          <div>
            <p className="text-[10px] font-bold text-success-400 uppercase mb-0.5">Income</p>
            <p className="text-lg font-bold text-success-400">
              {centsToDisplay(data.summary.income)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-danger-400 uppercase mb-0.5">Expense</p>
            <p className="text-lg font-bold text-danger-400">
              {centsToDisplay(data.summary.expenses)}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="flex gap-2 py-2">
        <button className="flex-1 py-2 px-4 rounded-xl border-2 border-midblue text-midblue font-bold text-sm bg-white hover:bg-midblue/5 transition-colors">
          Week
        </button>
        <button className="flex-1 py-2 px-4 rounded-xl border-2 border-midblue bg-midblue text-white font-bold text-sm shadow-soft">
          Month
        </button>
        <button className="flex-1 py-2 px-4 rounded-xl border-2 border-midblue text-midblue font-bold text-sm bg-white hover:bg-midblue/5 transition-colors">
          Year
        </button>
      </div>

      {/* Graphs Section */}
      <div className="bg-white rounded-3xl p-6 border-2 border-gray-100 min-h-[300px]">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6">Spending Breakdown</h3>
        {chartData.length > 0 ? (
          <div className="flex flex-col items-center justify-center space-y-8">
            <DonutChart data={chartData} size={200} strokeWidth={25} />
            <div className="w-full space-y-3">
              {data.categoryBreakdown.slice(0, 4).map((cat) => (
                <div key={cat.categoryId} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
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
