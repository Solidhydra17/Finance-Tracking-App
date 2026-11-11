import { useEffect, useState, type FormEvent } from 'react';
import { useUIStore } from '@/store';
import { createWallet } from '@/storage/indexeddb/wallets';

export const WelcomeWallet = () => {
  const darkMode = useUIStore((state) => state.darkMode);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const handleSubmit = async (event: FormEvent) => {
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
    <main className="flex min-h-screen items-center bg-[var(--bg-color)] px-6 py-16 text-[var(--text-main)]">
      <form onSubmit={handleSubmit} className="mx-auto w-full max-w-md space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-midblue dark:text-white">{greeting}</h1>
          <p className="text-sm font-medium leading-relaxed text-[var(--text-muted)]">
            Name your wallet to get started. It keeps its own transactions, bills, and accounts. You can add more wallets later.
          </p>
        </div>
        <div className="space-y-2">
          <label htmlFor="welcome-wallet-name" className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
            Wallet name
          </label>
          <input
            id="welcome-wallet-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Personal"
            maxLength={32}
            autoFocus
            autoComplete="off"
            className="min-h-12 w-full rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] px-4 text-base font-semibold text-[var(--text-main)] outline-none focus:border-midblue"
          />
        </div>
        {error && <p className="text-sm font-medium text-danger-500">{error}</p>}
        <button
          id="welcome-wallet-continue"
          type="submit"
          disabled={saving || name.trim().length === 0}
          className="min-h-12 w-full rounded-2xl bg-midblue text-base font-bold text-white disabled:opacity-50"
        >
          {saving ? 'Opening…' : 'Continue'}
        </button>
      </form>
    </main>
  );
};
