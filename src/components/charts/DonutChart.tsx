import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

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
  const chartData = {
    labels: data.map(d => d.label),
    datasets: [
      {
        data: data.map(d => d.value),
        backgroundColor: data.map(d => d.color),
        borderColor: data.map(d => d.color),
        borderWidth: 1,
        cutout: '75%', // This controls the "donut" hole size
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: false, // We use our own custom legend below the chart
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#1e293b',
        bodyColor: '#1e293b',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: 10,
        boxPadding: 5,
        usePointStyle: true,
      },
    },
  };

  return (
    <div style={{ width: size, height: size }} className="relative flex items-center justify-center mx-auto">
      <Doughnut data={chartData} options={options} />
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
