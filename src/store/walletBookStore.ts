import { create } from 'zustand';

export interface WalletProfile {
  id: string;
  name: string;
  dbName: string;
  createdAt: string;
}

export type WalletBookStatus = 'booting' | 'welcome' | 'ready';

interface WalletBookState {
  status: WalletBookStatus;
  wallets: WalletProfile[];
  activeId: string | null;
  setWelcome: () => void;
  setReady: (wallets: WalletProfile[], activeId: string) => void;
}

export const useWalletBookStore = create<WalletBookState>((set) => ({
  status: 'booting',
  wallets: [],
  activeId: null,
  setWelcome: () => set({ status: 'welcome', wallets: [], activeId: null }),
  setReady: (wallets, activeId) => set({ status: 'ready', wallets, activeId }),
}));
