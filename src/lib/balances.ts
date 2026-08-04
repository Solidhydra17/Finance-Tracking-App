/**
 * Financial balance computations.
 * Centralized to ensure Dashboard, Wallet screen, and Widget 
 * all display identically calculated values.
 */

export interface BalanceState {
    totalWalletBalance: number;
    totalCreditDebt: number;
    totalOwedToYou: number;
    totalYouOwe: number;
}

export function calculateBalances(state: BalanceState) {
    return {
        // Net Worth = Physical balance + money owed TO user (outbound loans) - money user owes (inbound loans)
        netWorth: state.totalWalletBalance + state.totalOwedToYou - state.totalYouOwe,
        
        // Projected Balance = Total Wallet Balance - Unpaid Credit - Unpaid Inbound Loans
        projectedBalance: state.totalWalletBalance - state.totalCreditDebt - state.totalYouOwe,
    };
}
