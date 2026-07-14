import type { WalletAccount } from '@/types';

export interface WalletRepository {
    getAll(): Promise<WalletAccount[]>;
    getById(id: number): Promise<WalletAccount | undefined>;
    create(account: Omit<WalletAccount, 'id' | 'createdAt' | 'balance'>): Promise<number>;
    update(id: number, updates: Partial<WalletAccount>): Promise<void>;
    delete(id: number): Promise<void>;
}
