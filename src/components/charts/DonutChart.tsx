import { useState, useEffect, useMemo } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, ChartEvent, ActiveElement } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import React from 'react';

const MemoizedDoughnut = React.memo(Doughnut);

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend);

interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
  strokeWidth?: number;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  size = 200,
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(true);

  // Hide hint after 5 seconds or on interaction
  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);

  const chartData = useMemo(() => ({
    labels: data.map(d => d.label),
    datasets: [
      {
        data: data.map(d => d.value),
        backgroundColor: data.map(d => d.color),
        borderColor: data.map(d => d.color),
        borderWidth: 1,
        cutout: '75%',
        hoverOffset: 10,
      },
    ],
  }), [data]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: true,
    onHover: (_event: ChartEvent, elements: ActiveElement[]) => {
      if (elements.length > 0) {
        setActiveIndex(elements[0].index);
        setShowHint(false);
      } else {
        setActiveIndex(null);
      }
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false, // We'll show info in the center instead
      },
    },
    layout: {
      padding: 15, // Gives room for the hoverOffset expansion
    },
  }), []);

  const activeCategory = activeIndex !== null ? data[activeIndex] : null;
  const percentage = activeCategory ? ((activeCategory.value / total) * 100).toFixed(0) : 0;

  return (
    <div style={{ width: size, height: size }} className="relative flex items-center justify-center mx-auto">
      {/* Chart */}
      <MemoizedDoughnut data={chartData} options={options} />

      {/* Center Display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-4">
        {activeCategory ? (
          <>
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tighter leading-none mb-1">
              {activeCategory.label}
            </p>
            <p className="text-2xl font-black text-midblue dark:text-white leading-none">
              {percentage}%
            </p>
          </>
        ) : (
          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest leading-tight">
            Tap to<br />explore
          </p>
        )}
      </div>

      {/* Onboarding Tooltip */}
      <div className={`absolute top-8 left-1/2 -translate-x-1/2 bg-midblue text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg animate-bounce whitespace-nowrap z-10 transition-opacity duration-700 pointer-events-none ${showHint ? 'opacity-100' : 'opacity-0'
        }`}>
        Click segments for details
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-midblue rotate-45" />
      </div>
    </div>
  );
};

interface BarChartProps {
  data: { label: string; value: number; color: string }[];
  maxValue?: number;
  height?: number;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  maxValue,
  height = 8,
}) => {
  const max = maxValue || Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex items-end gap-1 h-full">
      {data.map((item, index) => {
        const percentage = (item.value / max) * 100;
        return (
          <div key={index} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-full transition-all duration-300"
              style={{
                height: `${Math.max(percentage, 2)}%`,
                backgroundColor: item.color,
                minHeight: height,
              }}
            />
          </div>
        );
      })}
    </div>
  );
};
