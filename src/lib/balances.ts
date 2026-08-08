/**
 * Financial balance computations.
 * Centralized to ensure Dashboard, Wallet screen, and Widget 
 * all display identically calculated values from raw store inputs.
 */

export interface BalanceState {
    totalWalletBalance: number;
    totalCreditDebt: number;
    walletLoanDebt: number;
    peerLoanDebt: number;
    totalOwedToYou: number;
}

export function calculateBalances(state: BalanceState) {
    const totalLiabilities = state.walletLoanDebt + state.peerLoanDebt;

    return {
        // Raw values passed through for convenience if needed
        creditDebt: state.totalCreditDebt,
        loanDebt: totalLiabilities,
        
        // Net Worth = Physical balance + money owed TO user (outbound loans) - money user owes (all inbound loans)
        netWorth: state.totalWalletBalance + state.totalOwedToYou - totalLiabilities,
        
        // Projected Balance = Total Wallet Balance - Unpaid Credit - Unpaid Inbound Loans
        projectedBalance: state.totalWalletBalance - state.totalCreditDebt - totalLiabilities,
    };
}
