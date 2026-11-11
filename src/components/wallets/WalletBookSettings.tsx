import { useState, type FormEvent } from 'react';
import { Card, CardBody, Modal } from '@/components/ui';
import { useWalletBookStore } from '@/store';
import { createWallet, deleteWallet, renameWallet, switchWallet } from '@/storage/indexeddb/wallets';

export const WalletBookSettings = () => {
  const wallets = useWalletBookStore((state) => state.wallets);
  const activeId = useWalletBookStore((state) => state.activeId);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const pending = wallets.find((wallet) => wallet.id === pendingDeleteId);

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

  const handleRename = (id: string) => {
    renameWallet(id, renameValue);
    setRenamingId(null);
  };

  const handleDelete = async () => {
    if (!pendingDeleteId || deleting) return;
    setDeleting(true);
    try {
      await deleteWallet(pendingDeleteId);
    } catch (err) {
      setDeleting(false);
      setPendingDeleteId(null);
      setError(err instanceof Error ? err.message : 'Could not delete that wallet');
    }
  };

  return (
    <Card id="settings-wallets">
      <CardBody className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-xs font-bold uppercase tracking-widest text-midblue">Wallets</h3>
          <p className="text-xs font-medium leading-relaxed text-[var(--text-muted)]">
            Each wallet is separate. Switching changes the balances, bills, and accounts you see. There is no password. The last wallet cannot be deleted.
          </p>
        </div>
        <div className="space-y-2">
          {wallets.map((wallet) => {
            const selected = wallet.id === activeId;
            const renaming = renamingId === wallet.id;
            return (
              <div key={wallet.id} className={`space-y-2 rounded-2xl border p-3 ${selected ? 'border-midblue bg-midblue/10' : 'border-[var(--card-border)] bg-[var(--item-bg)]'}`}>
                {renaming ? (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      handleRename(wallet.id);
                    }}
                    className="flex gap-2"
                  >
                    <input
                      value={renameValue}
                      onChange={(event) => setRenameValue(event.target.value)}
                      maxLength={32}
                      aria-label={`Rename ${wallet.name}`}
                      className="min-h-11 min-w-0 flex-1 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-3 text-base font-semibold text-[var(--text-main)] outline-none focus:border-midblue"
                    />
                    <button type="submit" className="min-h-11 rounded-xl bg-midblue px-3 text-sm font-bold text-white">
                      Save
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => switchWallet(wallet.id)}
                    aria-pressed={selected}
                    className="flex min-h-11 w-full items-center justify-between text-left"
                  >
                    <span className="truncate font-bold text-[var(--text-main)]">{wallet.name}</span>
                    <span className="shrink-0 text-xs font-bold uppercase tracking-widest text-midblue">
                      {selected ? 'Viewing' : 'Switch'}
                    </span>
                  </button>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (renaming) {
                        setRenamingId(null);
                        return;
                      }
                      setRenamingId(wallet.id);
                      setRenameValue(wallet.name);
                    }}
                    className="min-h-11 flex-1 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] text-sm font-bold text-[var(--text-main)]"
                  >
                    {renaming ? 'Cancel' : 'Rename'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDeleteId(wallet.id)}
                    disabled={wallets.length === 1}
                    aria-label={wallets.length === 1 ? `Delete ${wallet.name}. Create another wallet first` : `Delete ${wallet.name}`}
                    className="min-h-11 flex-1 rounded-xl border border-danger-500/40 text-sm font-bold text-danger-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-danger-400"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <form onSubmit={handleCreate} className="space-y-2">
          <label htmlFor="settings-new-wallet" className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
            New wallet
          </label>
          <input
            id="settings-new-wallet"
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
      </CardBody>
      <Modal
        isOpen={pendingDeleteId !== null}
        onClose={() => { if (!deleting) setPendingDeleteId(null); }}
        title="Delete wallet?"
        size="sm"
        position="bottom"
      >
        <div className="space-y-4 pb-4">
          <p className="text-sm font-medium leading-relaxed text-[var(--text-muted)]">
            {pending
              ? `Delete ${pending.name}? Its transactions, bills, and accounts are removed. Your other wallets stay.`
              : 'Delete this wallet?'}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setPendingDeleteId(null)}
              disabled={deleting}
              className="min-h-12 flex-1 rounded-2xl border border-[var(--card-border)] bg-[var(--item-bg)] font-bold text-[var(--text-main)]"
            >
              Keep
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="min-h-12 flex-1 rounded-2xl bg-danger-500 font-bold text-white disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </Card>
  );
};
