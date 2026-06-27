import React from 'react';
import { Icon } from '@/components/ui';

export const LoansPage: React.FC = () => {
  return (
    <div id="page-loans" className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-24 h-24 bg-midblue/10 rounded-full flex items-center justify-center mb-6 animate-bounce">
        <Icon name="WrenchScrewdriverIcon" className="w-12 h-12 text-midblue dark:text-white" />
      </div>
      <h1 className="text-2xl font-black text-[var(--text-main)] mb-2 tracking-tight">Under Construction</h1>
      <p className="text-[var(--text-muted)] max-w-[280px] font-medium">
        We're building something great for your loans! Check back soon.
      </p>
    </div>
  );
};
