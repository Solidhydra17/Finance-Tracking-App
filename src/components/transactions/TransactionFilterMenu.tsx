import React, { useEffect, useRef, useState } from 'react'
import { FunnelIcon } from '@heroicons/react/24/outline'
import type { TransactionKindFilter } from '@/types'
import type { WalletAccountType } from '@/types'

type TransactionFilterMenuProps = {
  types: TransactionKindFilter[]
  wallets: WalletAccountType[]
  onApply: (types: TransactionKindFilter[], wallets: WalletAccountType[]) => void
}

const typeOptions: { id: TransactionKindFilter; label: string }[] = [
  { id: 'income', label: 'Income' },
  { id: 'expense', label: 'Expense' },
  { id: 'fund_transfer', label: 'Transfer' },
  { id: 'loans', label: 'Loan' },
  { id: 'credit_payment', label: 'Credit payment' },
]

const walletOptions: { id: WalletAccountType; label: string }[] = [
  { id: 'cash', label: 'Cash' },
  { id: 'credit', label: 'Credit' },
  { id: 'debit', label: 'Debit' },
  { id: 'ecash', label: 'E-cash' },
  { id: 'loan', label: 'Loan' },
  { id: 'deposit', label: 'Time deposit' },
]

const toggleValue = <T,>(list: T[], value: T): T[] => (
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
)

export const TransactionFilterMenu: React.FC<TransactionFilterMenuProps> = ({ types, wallets, onApply }) => {
  const [open, setOpen] = useState(false)
  const [draftTypes, setDraftTypes] = useState(types)
  const [draftWallets, setDraftWallets] = useState(wallets)
  const rootRef = useRef<HTMLDivElement>(null)
  const active = types.length > 0 || wallets.length > 0

  useEffect(() => {
    if (!open) return
    setDraftTypes(types)
    setDraftWallets(wallets)
    const handlePointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open, types, wallets])

  const handleToggle = () => setOpen((current) => !current)

  const handleDone = () => {
    onApply(draftTypes, draftWallets)
    setOpen(false)
  }

  const canClear = active || draftTypes.length > 0 || draftWallets.length > 0

  const handleClear = () => {
    if (!canClear) return
    setDraftTypes([])
    setDraftWallets([])
    onApply([], [])
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-label="Filter transactions"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={handleToggle}
        className={`flex h-11 w-11 items-center justify-center rounded-xl ${active || open ? 'bg-midblue text-white' : 'border border-[var(--card-border)] bg-[var(--card-bg)] text-midblue'}`}
      >
        <FunnelIcon className="h-5 w-5" />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Filter transactions"
          className="absolute right-0 top-[calc(100%+10px)] z-40 w-[20.5rem] max-w-[calc(100vw-2rem)]"
        >
          <span className="absolute -top-1.5 right-4 h-3 w-3 rotate-45 border-l border-t border-[var(--card-border)] bg-[var(--card-bg)]" />
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-[0_16px_40px_rgba(17,24,39,0.16)]">
            <FilterGroup title="Type">
              {typeOptions.map((option) => (
                <FilterChoice
                  key={option.id}
                  label={option.label}
                  checked={draftTypes.includes(option.id)}
                  onToggle={() => setDraftTypes((current) => toggleValue(current, option.id))}
                />
              ))}
            </FilterGroup>
            <FilterGroup title="Wallet">
              {walletOptions.map((option) => (
                <FilterChoice
                  key={option.id}
                  label={option.label}
                  checked={draftWallets.includes(option.id)}
                  onToggle={() => setDraftWallets((current) => toggleValue(current, option.id))}
                />
              ))}
            </FilterGroup>
            <div className="mt-2 flex items-center">
              <button
                type="button"
                onClick={handleClear}
                disabled={!canClear}
                className={`min-h-11 flex-1 text-sm font-black ${canClear ? 'text-[var(--text-muted)]' : 'cursor-default text-[var(--text-muted)] opacity-40'}`}
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleDone}
                className="min-h-11 flex-1 text-sm font-black text-midblue"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const FilterGroup = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-3">
    <p className="mb-1 px-1 text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{title}</p>
    <div className="grid grid-cols-2 gap-x-2">
      {children}
    </div>
  </div>
)

const FilterChoice = ({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={checked}
    onClick={onToggle}
    className={`flex min-h-11 items-center gap-2 rounded-lg px-1 text-left text-sm ${checked ? 'font-bold text-midblue' : 'font-medium text-[var(--text-muted)]'}`}
  >
    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border ${checked ? 'border-midblue bg-midblue text-white' : 'border-[var(--card-border)] bg-transparent'}`}>
      {checked && (
        <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
          <path d="M2.5 6.2 4.8 8.5 9.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
    <span className="truncate">{label}</span>
  </button>
)
