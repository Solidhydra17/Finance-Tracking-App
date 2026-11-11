import { billStatus, type BillStatus, type BillTone } from '@/lib/paymentPlanSchedule';
import { paymentPlanRepository } from '@/storage';

export type BillCounts = Record<BillTone, number>;

export interface BillCard {
  tone: BillTone;
  count: number;
  detail: string;
  pill: string;
}

export interface BillBoard {
  counts: BillCounts;
  cards: BillCard[];
  overview: string | null;
}

const TONES: BillTone[] = ['overdue', 'red', 'amber', 'green'];

const emptyCounts = (): BillCounts => ({
  overdue: 0,
  red: 0,
  amber: 0,
  green: 0,
});

const pillFor = (status: BillStatus) => {
  if (status.tone === 'green' && status.due) {
    return `Next ${status.due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }
  return status.label;
};

const detailFor = (names: string[]) => {
  if (names.length === 0) return 'No bills';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  if (names.length === 3) return `${names[0]}, ${names[1]} and 1 more`;
  return `${names[0]}, ${names[1]} and ${names.length - 2} more`;
};

const attentionPhrase = (name: string, status: BillStatus) => {
  if (status.tone === 'overdue') return `${name} is ${status.label.toLowerCase()}`;
  if (status.label === 'Due today') return `${name} is due today`;
  if (status.tone === 'red') return `${name} has ${status.label.toLowerCase()}`;
  if (status.tone === 'amber') return `${name} is ${status.label.toLowerCase()}`;
  return null;
};

export const loadBillBoard = async (): Promise<BillBoard> => {
  const plans = await paymentPlanRepository.getAll();
  const rows = await Promise.all(plans.map(async (plan) => ({
    plan,
    status: billStatus(plan, await paymentPlanRepository.expenseDates(plan.categoryId)),
  })));
  const counts = emptyCounts();
  const cards: BillCard[] = TONES.map((tone) => {
    const group = rows
      .filter((row) => row.status.tone === tone)
      .sort((a, b) => (a.status.daysLeft ?? 0) - (b.status.daysLeft ?? 0));
    counts[tone] = group.length;
    const names = group.map((row) => row.plan.name);
    return {
      tone,
      count: group.length,
      detail: detailFor(names),
      pill: group[0] ? pillFor(group[0].status) : 'None',
    };
  });
  const attention = rows
    .filter((row) => row.status.showOnHome)
    .sort((a, b) => (a.status.daysLeft ?? 0) - (b.status.daysLeft ?? 0))
    .map((row) => attentionPhrase(row.plan.name, row.status))
    .filter((line): line is string => Boolean(line));

  if (rows.length === 0) return { counts, cards, overview: null };
  if (attention.length === 0) return { counts, cards, overview: 'All bills are on track.' };
  return { counts, cards, overview: `${attention.join('. ')}.` };
};
