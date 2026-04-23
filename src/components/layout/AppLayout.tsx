import React, { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { ToastContainer, Modal, Icon } from "@/components/ui";
import { useUIStore } from "@/store";
import { AddTransactionModal } from "@/pages/AddTransactionModal";
import { useNavigate } from "react-router-dom";
import { db } from "@/storage/indexeddb";

export const AppLayout: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const cleanupDuplicates = async () => {
            const categories = await db.categories.toArray();
            const seen = new Set();
            const toDelete: number[] = [];

            for (const cat of categories) {
                const key = `${cat.name.toLowerCase()}-${cat.type}`;
                if (seen.has(key)) {
                    toDelete.push(cat.id!);
                } else {
                    seen.add(key);
                }
            }

            if (toDelete.length > 0) {
                await db.categories.bulkDelete(toDelete);
            }
        };
        cleanupDuplicates();
    }, []);
    const {
        isAddTransactionOpen,
        setAddTransactionOpen,
        isAddMenuOpen,
        setAddMenuOpen
    } = useUIStore();

    const handleAddSelect = (type: 'income' | 'expense') => {
        setAddMenuOpen(false);
        navigate(`/add-transaction?type=${type}`);
    };

    return (
        <div id="app-layout" className="min-h-screen bg-gray-50">
            <main id="app-main-content" className="pb-32 pt-2">
                <Outlet />
            </main>

            <BottomNav onAddClick={() => setAddMenuOpen(true)} />

            <ToastContainer />

            {/* Selection Menu (Bottom Sheet Style) */}
            <Modal
                isOpen={isAddMenuOpen}
                onClose={() => setAddMenuOpen(false)}
                title="Add Transaction"
                size="sm"
                position="bottom"
            >
                <div id="add-menu-options" className="grid grid-cols-2 gap-4 pt-2 pb-6">
                    <button
                        onClick={() => handleAddSelect('income')}
                        className="flex flex-col items-center justify-center gap-3 p-6 bg-success-50 rounded-3xl border-2 border-transparent hover:border-success-500 transition-all active:scale-95 group"
                    >
                        <div className="w-16 h-16 bg-success-500 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                            <Icon name="ArrowTrendingUpIcon" className="w-8 h-8" />
                        </div>
                        <span id="btn-add-income" className="font-bold text-success-700">Income</span>
                    </button>

                    <button
                        onClick={() => handleAddSelect('expense')}
                        className="flex flex-col items-center justify-center gap-3 p-6 bg-danger-50 rounded-3xl border-2 border-transparent hover:border-danger-500 transition-all active:scale-95 group"
                    >
                        <div className="w-16 h-16 bg-danger-500 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                            <Icon name="ArrowTrendingDownIcon" className="w-8 h-8" />
                        </div>
                        <span id="btn-add-expense" className="font-bold text-danger-700">Expense</span>
                    </button>
                </div>
            </Modal>

            <Modal
                isOpen={isAddTransactionOpen}
                onClose={() => setAddTransactionOpen(false)}
                title="Edit Transaction"
                size="lg"
            >
                <AddTransactionModal
                    onClose={() => setAddTransactionOpen(false)}
                />
            </Modal>
        </div>
    );
};
