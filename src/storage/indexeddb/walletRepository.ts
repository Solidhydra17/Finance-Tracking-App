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

    async create(account: Omit<WalletAccount, 'id' | 'createdAt'>): Promise<number> {
        const newAccount: WalletAccount = {
            ...account,
            createdAt: new Date().toISOString()
        };
        return await db.walletAccounts.add(newAccount);
    }

    async update(id: number, updates: Partial<WalletAccount>): Promise<void> {
        await db.walletAccounts.update(id, updates);
    }

    async delete(id: number): Promise<void> {
        await db.walletAccounts.delete(id);
    }

    async adjustBalance(id: number, amountDeltaCents: number): Promise<void> {
        await db.transaction('rw', db.walletAccounts, async () => {
            const account = await db.walletAccounts.get(id);
            if (!account) throw new Error(`Wallet account ${id} not found`);
            await db.walletAccounts.update(id, { balance: account.balance + amountDeltaCents });
        });
    }
}

export const walletRepository = new IndexedDBWalletRepository();
