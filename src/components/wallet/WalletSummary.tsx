import React from 'react';
import { Card, CardBody, Icon } from '@/components/ui';
import { useWalletStore, useLoanStore, useUIStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';
import { formatCurrency } from '@/lib/money';
import { Link } from 'react-router-dom';

export const WalletSummary: React.FC = () => {
    const { totalWalletBalance, totalCreditDebt } = useWalletStore(useShallow(state => ({
        totalWalletBalance: state.totalWalletBalance,
        totalCreditDebt: state.totalCreditDebt
    })));

    const { totalOwedToYou, totalYouOwe } = useLoanStore(useShallow(state => ({
        totalOwedToYou: state.totalOwedToYou,
        totalYouOwe: state.totalYouOwe
    })));

    const { currencySymbol, currencyPosition, creditWarningThreshold } = useUIStore(useShallow(state => ({
        currencySymbol: state.currencySymbol,
        currencyPosition: state.currencyPosition,
        creditWarningThreshold: state.creditWarningThreshold
    })));

    // Projected Balance = Total Wallet Balance - Unpaid Credit - Unpaid Inbound Loans
    const projectedBalance = totalWalletBalance - totalCreditDebt - totalYouOwe;
    
    // Total debit balance for percentage calculation (Debit + Cash)
    const debitBalance = totalWalletBalance;
    const creditDebtPercentage = debitBalance > 0 ? (totalCreditDebt / debitBalance) * 100 : 0;
    
    const isCreditWarning = creditDebtPercentage >= creditWarningThreshold;

    return (
        <Card className="bg-gradient-to-br from-midblue to-blue-800 text-white border-none shadow-2xl relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 rounded-full bg-blue-400/20 blur-2xl pointer-events-none" />

            <CardBody className="relative z-10 space-y-6">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mb-1">Total Wallet Balance</p>
                        <h2 className="text-4xl font-extrabold tracking-tight">
                            {formatCurrency(totalWalletBalance, currencySymbol, currencyPosition)}
                        </h2>
                    </div>
                    <Link to="/settings" className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
                        <Icon name="Cog6ToothIcon" className="w-5 h-5 text-white" />
                    </Link>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                    <div>
                        <div className="flex items-center gap-1.5 mb-1">
                            <Icon name="ChartBarIcon" className="w-4 h-4 text-blue-200" />
                            <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest">Projected Balance</p>
                        </div>
                        <p className="text-lg font-bold">
                            {formatCurrency(projectedBalance, currencySymbol, currencyPosition)}
                        </p>
                    </div>

                    <div>
                        <div className="flex items-center gap-1.5 mb-1">
                            <Icon name="CreditCardIcon" className={`w-4 h-4 ${isCreditWarning ? 'text-red-300' : 'text-blue-200'}`} />
                            <p className={`text-[10px] font-bold uppercase tracking-widest ${isCreditWarning ? 'text-red-300' : 'text-blue-200'}`}>Credit Debt</p>
                        </div>
                        <p className={`text-lg font-bold ${isCreditWarning ? 'text-red-400' : 'text-white'}`}>
                            {formatCurrency(totalCreditDebt, currencySymbol, currencyPosition)}
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
                            +{formatCurrency(totalOwedToYou, currencySymbol, currencyPosition)}
                        </p>
                    </div>

                    <div>
                        <div className="flex items-center gap-1.5 mb-1">
                            <Icon name="ArrowTrendingDownIcon" className="w-4 h-4 text-rose-300" />
                            <p className="text-rose-300 text-[10px] font-bold uppercase tracking-widest">You Owe (Loans)</p>
                        </div>
                        <p className="text-lg font-bold text-rose-400">
                            -{formatCurrency(totalYouOwe, currencySymbol, currencyPosition)}
                        </p>
                    </div>
                </div>

                {isCreditWarning && (
                    <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl flex items-start gap-2">
                        <Icon name="ExclamationTriangleIcon" className="w-5 h-5 text-red-300 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-100 font-medium leading-tight">
                            Warning: Your total credit card debt ({creditDebtPercentage.toFixed(0)}%) exceeds your safety threshold of {creditWarningThreshold}% of your available funds.
                        </p>
                    </div>
                )}
            </CardBody>
        </Card>
    );
};
