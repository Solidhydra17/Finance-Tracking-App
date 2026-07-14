import { db } from './database';
import type { WalletAccount } from '@/types';
import type { WalletRepository } from '@/domain/wallet/walletRepository';

export class IndexedDBWalletRepository implements WalletRepository {
    async getAll(): Promise<WalletAccount[]> {
        return await db.walletAccounts.toArray();
    }

    async getById(id: number): Promise<WalletAccount | undefined> {
        return await db.walletAccounts.get(id);
    }

    async create(account: Omit<WalletAccount, 'id' | 'createdAt' | 'balance'>): Promise<number> {
        const newAccount = {
            ...account,
            createdAt: new Date().toISOString()
        };
        return await db.walletAccounts.add(newAccount as any);
    }

    async update(id: number, updates: Partial<WalletAccount>): Promise<void> {
        await db.walletAccounts.update(id, updates);
    }

    async delete(id: number): Promise<void> {
        await db.walletAccounts.delete(id);
    }
}

export const walletRepository = new IndexedDBWalletRepository();
