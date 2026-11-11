import Dexie from 'dexie';
import { markSkipFunnyLoad } from '@/lib/skipFunnyLoad';
import { useWalletBookStore, type WalletProfile } from '@/store/walletBookStore';
import {
  PRIMARY_DB_NAME,
  FinanceDatabase,
  setActiveDatabase,
  closeActiveDatabase,
  peekActiveDatabase,
  ensureFreshInstallDefaults,
} from './database';

const STORAGE_KEY = 'kuripot-wallets';

interface WalletRegistry {
  activeId: string;
  wallets: WalletProfile[];
}

const createId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `w_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const readRegistry = (): WalletRegistry | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WalletRegistry;
    if (!parsed || !Array.isArray(parsed.wallets)) return null;
    const wallets = parsed.wallets.filter((wallet) =>
      Boolean(wallet && wallet.id && wallet.name && wallet.dbName)
    );
    if (wallets.length === 0) return null;
    const activeId = wallets.some((wallet) => wallet.id === parsed.activeId)
      ? parsed.activeId
      : wallets[0].id;
    return { activeId, wallets };
  } catch {
    return null;
  }
};

const writeRegistry = (registry: WalletRegistry): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(registry));
};

export const getActiveWallet = (): WalletProfile | null => {
  const registry = readRegistry();
  if (!registry) return null;
  return registry.wallets.find((wallet) => wallet.id === registry.activeId) ?? registry.wallets[0];
};

const openWalletDatabase = async (dbName: string): Promise<void> => {
  const database = new FinanceDatabase(dbName);
  await database.open();
  setActiveDatabase(database);
};

const hasEstablishedUse = async (database: FinanceDatabase): Promise<boolean> => {
  const counts = await Promise.all([
    database.transactions.count(),
    database.loans.count(),
    database.loanPayments.count(),
    database.recurringRules.count(),
    database.budgetPlans.count(),
    database.budgetItems.count(),
    database.paymentPlans.count(),
    database.bankRules.count(),
    database.creditPayments.count(),
  ]);
  if (counts.some((count) => count > 0)) return true;

  const accounts = await database.walletAccounts.toArray();
  if (accounts.length > 1) return true;
  if (accounts.some((account) => account.name !== 'Cash' || account.type !== 'cash' || (account.balance ?? 0) !== 0)) {
    return true;
  }

  const customCategories = await database.categories.filter((category) => category.isCustom === true).count();
  return customCategories > 0;
};

const adoptExistingDatabase = async (): Promise<boolean> => {
  const database = new FinanceDatabase(PRIMARY_DB_NAME);
  await database.open();
  const established = await hasEstablishedUse(database);
  if (!established) {
    database.close();
    return false;
  }

  const wallet: WalletProfile = {
    id: createId(),
    name: 'My Wallet',
    dbName: PRIMARY_DB_NAME,
    createdAt: new Date().toISOString(),
  };
  writeRegistry({ activeId: wallet.id, wallets: [wallet] });
  setActiveDatabase(database);
  useWalletBookStore.getState().setReady([wallet], wallet.id);
  return true;
};

export const bootstrapWallets = async (): Promise<void> => {
  const saved = readRegistry();
  if (saved) {
    const active = saved.wallets.find((wallet) => wallet.id === saved.activeId) ?? saved.wallets[0];
    try {
      await openWalletDatabase(active.dbName);
      useWalletBookStore.getState().setReady(saved.wallets, active.id);
      return;
    } catch (error) {
      console.error('[wallets] Could not open the selected wallet', error);
    }
  }

  try {
    const adopted = await adoptExistingDatabase();
    if (adopted) return;
  } catch (error) {
    console.error('[wallets] Could not read the existing database', error);
    try {
      await openWalletDatabase(PRIMARY_DB_NAME);
      const wallet: WalletProfile = {
        id: createId(),
        name: 'My Wallet',
        dbName: PRIMARY_DB_NAME,
        createdAt: new Date().toISOString(),
      };
      writeRegistry({ activeId: wallet.id, wallets: [wallet] });
      useWalletBookStore.getState().setReady([wallet], wallet.id);
      return;
    } catch (openError) {
      console.error('[wallets] Could not recover the existing database', openError);
    }
  }

  useWalletBookStore.getState().setWelcome();
};

const cleanName = (name: string): string => name.trim().slice(0, 32);

export const createWallet = async (name: string): Promise<void> => {
  const trimmed = cleanName(name);
  if (!trimmed) throw new Error('Enter a wallet name');

  const registry = readRegistry();
  const id = createId();
  const dbName = registry && registry.wallets.length > 0 ? `${PRIMARY_DB_NAME}__${id}` : PRIMARY_DB_NAME;
  const profile: WalletProfile = {
    id,
    name: trimmed,
    dbName,
    createdAt: new Date().toISOString(),
  };
  const next: WalletRegistry = {
    activeId: id,
    wallets: [...(registry?.wallets ?? []), profile],
  };
  const previous = registry;

  writeRegistry(next);
  try {
    await openWalletDatabase(dbName);
    await ensureFreshInstallDefaults();
  } catch (error) {
    if (previous) {
      writeRegistry(previous);
      const previousActive = previous.wallets.find((wallet) => wallet.id === previous.activeId) ?? previous.wallets[0];
      await openWalletDatabase(previousActive.dbName);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      closeActiveDatabase();
    }
    throw error;
  }

  markSkipFunnyLoad();
  window.location.reload();
};

export const switchWallet = (id: string): void => {
  const registry = readRegistry();
  if (!registry) return;
  if (!registry.wallets.some((wallet) => wallet.id === id)) return;
  if (registry.activeId === id) return;
  writeRegistry({ ...registry, activeId: id });
  markSkipFunnyLoad();
  window.location.reload();
};

export const renameWallet = (id: string, name: string): void => {
  const trimmed = cleanName(name);
  if (!trimmed) return;
  const registry = readRegistry();
  if (!registry) return;
  const wallets = registry.wallets.map((wallet) => (
    wallet.id === id ? { ...wallet, name: trimmed } : wallet
  ));
  writeRegistry({ ...registry, wallets });
  useWalletBookStore.getState().setReady(wallets, registry.activeId);
};

export const deleteWallet = async (id: string): Promise<void> => {
  const registry = readRegistry();
  if (!registry) return;
  if (registry.wallets.length <= 1) {
    throw new Error('Create another wallet before deleting this one');
  }
  const target = registry.wallets.find((wallet) => wallet.id === id);
  if (!target) return;

  const wasActive = peekActiveDatabase()?.name === target.dbName;
  if (wasActive) closeActiveDatabase();

  try {
    await Dexie.delete(target.dbName);
  } catch (error) {
    if (wasActive) await openWalletDatabase(target.dbName);
    throw error;
  }

  const remaining = registry.wallets.filter((wallet) => wallet.id !== id);
  if (remaining.length === 0) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    const activeId = registry.activeId === id ? remaining[0].id : registry.activeId;
    writeRegistry({ activeId, wallets: remaining });
  }

  markSkipFunnyLoad();
  window.location.reload();
};
