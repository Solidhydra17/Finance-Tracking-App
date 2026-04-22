import React from 'react';
import { DonutChart } from '@/components/charts';
import { Card, CardBody, Badge } from '@/components/ui';
import { useDashboard } from '@/hooks';
import { useUIStore } from '@/store';
import { centsToDisplay } from '@/lib/money';

export const DashboardPage: React.FC = () => {
  const { filters, showLoans } = useUIStore();
  const { data, isLoading } = useDashboard(filters, showLoans);

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin text-3xl">⏳</div>
      </div>
    );
  }

  const chartData = data.categoryBreakdown.map((c) => ({
    label: c.categoryName,
    value: c.total,
    color: c.color,
  }));

  return (
    <div className="px-4 space-y-4">
      {/* Balance Card */}
      <Card gradient>
        <CardBody>
          <div className="text-center py-4">
            <p className="text-sm text-gray-600 mb-1">Total Balance</p>
            <h1
              className={`text-4xl font-bold ${
                data.summary.totalBalance >= 0
                  ? 'text-success-600'
                  : 'text-danger-600'
              }`}
            >
              {centsToDisplay(data.summary.totalBalance)}
            </h1>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-white/50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Income</p>
              <p className="text-lg font-semibold text-success-600">
                {centsToDisplay(data.summary.income)}
              </p>
            </div>
            <div className="bg-white/50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Expenses</p>
              <p className="text-lg font-semibold text-danger-600">
                {centsToDisplay(data.summary.expenses)}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Category Breakdown */}
      {chartData.length > 0 && (
        <Card>
          <CardBody>
            <h3 className="text-sm font-medium text-gray-700 mb-4">Spending by Category</h3>
            <div className="flex items-center justify-center">
              <DonutChart data={chartData} size={140} strokeWidth={20} />
            </div>
            <div className="mt-4 space-y-2">
              {data.categoryBreakdown.slice(0, 5).map((cat) => (
                <div key={cat.categoryId} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{cat.icon}</span>
                    <span className="text-sm text-gray-700">{cat.categoryName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {centsToDisplay(cat.total)}
                    </span>
                    <Badge variant="default" size="sm">
                      {cat.percentage.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Largest Expense */}
      {data.largestExpense && (
        <Card>
          <CardBody>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Largest Expense</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-danger-600">
                  {centsToDisplay(data.largestExpense.amount)}
                </p>
                <p className="text-sm text-gray-500">{data.largestExpense.note || 'Expense'}</p>
              </div>
              <span className="text-sm text-gray-400">
                {new Date(data.largestExpense.date).toLocaleDateString()}
              </span>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Loan Summary */}
      {showLoans && data.summary.loanExposure !== 0 && (
        <Card>
          <CardBody>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Loan Exposure</h3>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {data.summary.loanExposure > 0 ? 'You lent' : 'You borrowed'}
              </p>
              <p
                className={`text-lg font-semibold ${
                  data.summary.loanExposure > 0
                    ? 'text-primary-600'
                    : 'text-warning-600'
                }`}
              >
                {centsToDisplay(Math.abs(data.summary.loanExposure))}
              </p>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
};
