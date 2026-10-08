/**
 * Financial balance computations.
 * Centralized so Dashboard, Wallet screen, and Widget display the same values.
 *
 * Total Wallet Balance (headline) = cash + debit + e-cash
 *   + money owed to you
 *   − institutional loan debt − P2P money you owe
 * Credit card debt is NOT deducted here; it only affects Projected Balance.
 *
 * Projected Balance = cash + debit + e-cash
 *   − credit card debt − institutional loans − P2P money you owe
 */

export interface BalanceState {
    totalWalletBalance: number;
    totalCreditDebt: number;
    walletLoanDebt: number;
    peerLoanDebt: number;
    totalOwedToYou: number;
}

export function calculateBalances(state: BalanceState) {
    const loanDebt = state.walletLoanDebt + state.peerLoanDebt;

    return {
        creditDebt: state.totalCreditDebt,
        loanDebt,

        // Matches the home widget headline: include receivables, exclude credit.
        displayedWalletTotal:
            state.totalWalletBalance + state.totalOwedToYou - loanDebt,

        projectedBalance:
            state.totalWalletBalance - state.totalCreditDebt - loanDebt,
    };
}
