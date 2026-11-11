import { useId, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowsRightLeftIcon } from '@heroicons/react/24/outline';
import { Modal } from '@/components/ui';
import { useWalletBookStore } from '@/store';
import { createWallet, switchWallet } from '@/storage/indexeddb/wallets';

export const WalletSwitcher = () => {
  const navigate = useNavigate();
  const inputId = useId();
  const wallets = useWalletBookStore((state) => state.wallets);
  const activeId = useWalletBookStore((state) => state.activeId);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleOpen = () => {
    setError('');
    setOpen(true);
  };

  const handleSwitch = (id: string) => {
    if (id === activeId) {
      setOpen(false);
      return;
    }
    switchWallet(id);
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setError('');
    setSaving(true);
    try {
      await createWallet(name);
    } catch (err) {
      setSaving(false);
      setError(err instanceof Error ? err.message : 'Could not create that wallet');
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-haspopup="dialog"
        aria-label="Switch wallet"
        className="inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap text-sm font-bold text-midblue dark:text-white"
      >
        <ArrowsRightLeftIcon className="h-5 w-5" aria-hidden="true" />
        Switch wallet
      </button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Wallets" position="bottom">
        <div className="space-y-3 pb-4">
          <p className="text-sm font-medium text-[var(--text-muted)]">
            Choose which wallet to view. Balances, bills, and accounts follow this choice.
          </p>
          <div className="space-y-2">
            {wallets.map((wallet) => {
              const selected = wallet.id === activeId;
              return (
                <button
                  key={wallet.id}
                  type="button"
                  onClick={() => handleSwitch(wallet.id)}
                  aria-pressed={selected}
                  className={`flex min-h-11 w-full items-center justify-between rounded-2xl border px-4 text-left text-sm font-bold ${selected ? 'border-midblue bg-midblue/10 text-midblue dark:text-white' : 'border-[var(--card-border)] bg-[var(--item-bg)] text-[var(--text-main)]'}`}
                >
                  <span className="truncate">{wallet.name}</span>
                  <span className="shrink-0 text-xs uppercase tracking-widest">{selected ? 'Viewing' : 'Switch'}</span>
                </button>
              );
            })}
          </div>
          <form onSubmit={handleCreate} className="space-y-2 border-t border-[var(--card-border)] pt-3">
            <label htmlFor={inputId} className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
              New wallet
            </label>
            <input
              id={inputId}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Family, Business…"
              maxLength={32}
              autoComplete="off"
              className="min-h-12 w-full rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] px-4 text-base font-semibold text-[var(--text-main)] outline-none focus:border-midblue"
            />
            {error && <p className="text-sm font-medium text-danger-500">{error}</p>}
            <button
              type="submit"
              disabled={saving || name.trim().length === 0}
              className="min-h-11 w-full rounded-2xl bg-midblue text-sm font-bold text-white disabled:opacity-50"
            >
              {saving ? 'Creating…' : 'Create wallet'}
            </button>
          </form>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate('/settings');
            }}
            className="min-h-11 w-full text-sm font-bold text-[var(--text-muted)]"
          >
            Rename or delete in Settings
          </button>
        </div>
      </Modal>
    </>
  );
};
