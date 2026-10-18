/**
 * Financial balance computations.
 * Centralized so Dashboard, Wallet screen, and Widget display the same values.
 *
 * Total Wallet Balance = cash + debit + e-cash + money owed to you.
 * Credit and loan debts are NOT deducted here.
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

        displayedWalletTotal:
            state.totalWalletBalance + state.totalOwedToYou,

        projectedBalance:
            state.totalWalletBalance - state.totalCreditDebt - loanDebt,
    };
}
