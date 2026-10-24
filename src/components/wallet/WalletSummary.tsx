import React from 'react';
import { Card, CardBody, Icon } from '@/components/ui';
import { useWalletStore, useLoanStore, useUIStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';
import { formatCurrency } from '@/lib/money';
import { calculateBalances } from '@/lib/balances';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export const WalletSummary: React.FC = () => {
    const { totalWalletBalance, totalCreditDebt, totalWalletLoanDebt } = useWalletStore(useShallow(state => ({
        totalWalletBalance: state.totalWalletBalance,
        totalCreditDebt: state.totalCreditDebt,
        totalWalletLoanDebt: state.totalWalletLoanDebt
    })));

    const { totalOwedToYou, totalYouOwe } = useLoanStore(useShallow(state => ({
        totalOwedToYou: state.totalOwedToYou,
        totalYouOwe: state.totalYouOwe
    })));

    const { currencySymbol, currencyPosition, creditWarningThreshold, balancesHidden, toggleBalancesHidden } = useUIStore(useShallow(state => ({
        currencySymbol: state.currencySymbol,
        currencyPosition: state.currencyPosition,
        creditWarningThreshold: state.creditWarningThreshold,
        balancesHidden: state.balancesHidden,
        toggleBalancesHidden: state.toggleBalancesHidden,
    })));

    const { displayedWalletTotal, projectedBalance } = calculateBalances({
        totalWalletBalance,
        totalCreditDebt,
        walletLoanDebt: totalWalletLoanDebt,
        peerLoanDebt: totalYouOwe,
        totalOwedToYou,
    });

    // Warning threshold: credit cards + institutional loan debt relative to available funds
    // Zero-balance guard prevents Infinity / NaN
    const totalLiabilitiesForWarning = totalCreditDebt + totalWalletLoanDebt;
    const creditDebtPercentage = totalWalletBalance > 0 ? (totalLiabilitiesForWarning / totalWalletBalance) * 100 : 0;

    const isCreditWarning = creditDebtPercentage >= creditWarningThreshold;
    const hasCreditWarning = isCreditWarning;

    return (
        <Card className="bg-gradient-to-br from-midblue to-blue-800 text-white border-none shadow-2xl relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 rounded-full bg-blue-400/20 blur-2xl pointer-events-none" />

            <CardBody className="relative z-10 space-y-6">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mb-1">Total Wallet Balance</p>
                        <h2 className="text-4xl font-extrabold tracking-tight text-white">
                            {balancesHidden ? '••••' : formatCurrency(displayedWalletTotal, currencySymbol, currencyPosition)}
                        </h2>
                    </div>
                    <button type="button" onClick={toggleBalancesHidden} aria-label={balancesHidden ? 'Show balances' : 'Hide balances'} aria-pressed={balancesHidden} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white">
                        {balancesHidden ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                    <div>
                        <div className="flex items-center gap-1.5 mb-1">
                            <Icon name="ChartBarIcon" className="w-4 h-4 text-blue-200" />
                            <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest">Projected Balance</p>
                        </div>
                        <p className="text-lg font-bold text-white">
                            {balancesHidden ? '••••' : formatCurrency(projectedBalance, currencySymbol, currencyPosition)}
                        </p>
                    </div>

                    <div>
                        <div className="flex items-center gap-1.5 mb-1">
                            <Icon name="CreditCardIcon" className={`w-4 h-4 ${hasCreditWarning ? 'text-red-300' : 'text-blue-200'}`} />
                            <p className={`text-[10px] font-bold uppercase tracking-widest ${hasCreditWarning ? 'text-red-300' : 'text-blue-200'}`}>Credit Card Debt</p>
                        </div>
                        <p className={`text-lg font-bold ${hasCreditWarning ? 'text-red-400' : 'text-white'}`}>
                            {balancesHidden ? '••••' : formatCurrency(totalCreditDebt, currencySymbol, currencyPosition)}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                    <div>
                        <div className="flex items-center gap-1.5 mb-1">
                            <Icon name="ArrowTrendingUpIcon" className="w-4 h-4 text-emerald-300" />
                            <p className="text-emerald-300 text-[10px] font-bold uppercase tracking-widest">Owed to You</p>
                        </div>
                        <p className="text-lg font-bold text-emerald-400">
                            {balancesHidden ? '••••' : `+${formatCurrency(totalOwedToYou, currencySymbol, currencyPosition)}`}
                        </p>
                    </div>

                    <div>
                        <div className="flex items-center gap-1.5 mb-1">
                            <Icon name="ArrowTrendingDownIcon" className="w-4 h-4 text-rose-300" />
                            <p className="text-rose-300 text-[10px] font-bold uppercase tracking-widest">Loan Debt</p>
                        </div>
                        <p className="text-lg font-bold text-rose-400">
                            {balancesHidden ? '••••' : `-${formatCurrency(totalWalletLoanDebt + totalYouOwe, currencySymbol, currencyPosition)}`}
                        </p>
                    </div>
                </div>

                {hasCreditWarning && (
                    <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl flex items-start gap-2">
                        <Icon name="ExclamationTriangleIcon" className="w-5 h-5 text-red-300 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-100 font-medium leading-tight">
                            Warning: Your total credit card &amp; institutional loan debt ({creditDebtPercentage.toFixed(0)}%) exceeds your safety threshold of {creditWarningThreshold}% of your available funds.
                        </p>
                    </div>
                )}
            </CardBody>
        </Card>
    );
};
