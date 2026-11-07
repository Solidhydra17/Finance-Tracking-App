export type BankRuleKind = 'savings' | 'cashback' | 'loan' | 'deposit';

export type BankRuleCreditWhen = 'daily' | 'month-end' | 'month-start' | 'maturity';

export type BankRuleMethod = 'addon' | 'revolving';

export type BankRuleTierStyle = 'excess' | 'whole';

export type BankRuleCashbackCap = 'all' | 'group';

export type BankRuleCashbackNames = 'maribank' | 'none';

export interface BankRule {
  id?: number;
  kind: BankRuleKind;
  name: string;
  accountId: number;
  payFromAccountId?: number;
  active: boolean;
  preset: string;
  ratePct: number;
  tierStyle: BankRuleTierStyle;
  tierRatePct: number;
  tierFromCents: number;
  tierTopRatePct: number;
  tierTopFromCents: number;
  dayCount: 365 | 360;
  creditWhen: BankRuleCreditWhen;
  taxPct: number;
  minBalanceCents: number;
  cashbackPct: number;
  monthlyCapCents: number;
  /** 'all' caps every eligible purchase. 'group' caps only food, health, and fuel. */
  cashbackCapScope?: BankRuleCashbackCap;
  /** 'maribank' skips utilities, transport, donations, taxes, and fees by category name. */
  cashbackNames?: BankRuleCashbackNames;
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
