export type BankRuleKind = 'savings' | 'cashback' | 'loan' | 'deposit';

export type BankRuleCreditWhen = 'daily' | 'month-end' | 'month-start' | 'maturity';

export type BankRuleMethod = 'addon' | 'revolving';

export interface BankRule {
  id?: number;
  kind: BankRuleKind;
  name: string;
  accountId: number;
  payFromAccountId?: number;
  active: boolean;
  preset: string;
  ratePct: number;
  tierRatePct: number;
  tierFromCents: number;
  dayCount: 365 | 360;
  creditWhen: BankRuleCreditWhen;
  taxPct: number;
  minBalanceCents: number;
  cashbackPct: number;
  monthlyCapCents: number;
  excludedCategoryIds: number[];
  monthlyRatePct: number;
  tenorMonths: number;
  principalCents: number;
  processingPct: number;
  includeDst: boolean;
  lateFixedPct: number;
  lateDailyPct: number;
  lateFeeCents: number;
  dueDay: number;
  method: BankRuleMethod;
  paidInFull: boolean;
  paidEarly: boolean;
  earlyCashbackCents?: number;
  startDate: string;
  lastPostedPeriod: string | null;
  createdAt: string;
  updatedAt: string;
}
