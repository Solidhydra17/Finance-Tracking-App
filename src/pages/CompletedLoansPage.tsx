import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { WalletLoansList } from '@/components/wallet/WalletLoansList'
import { useLoanStore, useWalletStore } from '@/store'

export const CompletedLoansPage: React.FC = () => {
  const navigate = useNavigate()
  const fetchLoans = useLoanStore((state) => state.fetchLoans)
  const fetchAccounts = useWalletStore((state) => state.fetchAccounts)

  useEffect(() => {
    fetchLoans()
    fetchAccounts()
  }, [fetchLoans, fetchAccounts])

  return (
    <div className="mx-auto w-full max-w-md space-y-5 px-4 pb-8 pt-4">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--card-bg)] text-[var(--text-main)]"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <h1 className="min-w-0 flex-1 text-2xl font-extrabold text-midblue dark:text-white">Completed loans</h1>
      </header>
      <WalletLoansList variant="completed" />
    </div>
  )
}
