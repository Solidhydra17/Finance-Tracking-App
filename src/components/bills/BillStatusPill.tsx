import type { BillStatus } from '@/lib/paymentPlanSchedule';

const TONE_CLASS: Record<BillStatus['tone'], string> = {
  green: 'bg-success-100 text-success-800 dark:bg-success-500/15 dark:text-success-300',
  amber: 'bg-warning-100 text-warning-800 dark:bg-warning-500/15 dark:text-warning-300',
  red: 'bg-danger-100 text-danger-700 dark:bg-danger-500/15 dark:text-danger-300',
  overdue: 'bg-danger-600 text-white',
};

export const BillStatusPill = ({ status }: { status: BillStatus }) => (
  <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ${TONE_CLASS[status.tone]}`}>
    {status.label}
  </span>
);
