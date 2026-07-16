import React, { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { ToastContainer, Modal, Icon } from "@/components/ui";
import { ConnectivityListener, StatusToast } from "@/components/ui/StatusToast";
import { PWAUpdateBanner } from "@/components/ui/PWAUpdateBanner";
import { useUIStore } from "@/store";
import { useShallow } from 'zustand/react/shallow';
import { AddTransactionModal } from "@/pages/AddTransactionModal";
import { useNavigate } from "react-router-dom";
import { FundTransferModal } from "@/components/wallet/FundTransferModal";

export const AppLayout: React.FC = () => {
    const navigate = useNavigate();

    const {
        isAddTransactionOpen,
        setAddTransactionOpen,
        isAddMenuOpen,
        setAddMenuOpen,
        setTransferOpen,
        darkMode
    } = useUIStore(useShallow(state => ({
        isAddTransactionOpen: state.isAddTransactionOpen,
        setAddTransactionOpen: state.setAddTransactionOpen,
        isAddMenuOpen: state.isAddMenuOpen,
        setAddMenuOpen: state.setAddMenuOpen,
        setTransferOpen: state.setTransferOpen,
        darkMode: state.darkMode
    })));

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [darkMode]);

    const handleAddSelect = (type: 'income' | 'expense' | 'loan' | 'transfer') => {
        setAddMenuOpen(false);
        if (type === 'loan') {
            navigate('/add-loan');
        } else if (type === 'transfer') {
            setTransferOpen(true);
        } else {
            navigate(`/add-transaction?type=${type}`);
        }
    };

    return (
        <div id="app-layout" className="min-h-screen bg-[var(--bg-color)] flex flex-col transition-colors duration-200">
            <main id="app-main-content" className="pb-32 pt-2">
                <Outlet />
            </main>

            <BottomNav onAddClick={() => setAddMenuOpen(true)} />

            <ToastContainer />
            <StatusToast />
            <ConnectivityListener />
            <PWAUpdateBanner />
            <FundTransferModal />

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
                        className="flex flex-col items-center justify-center gap-3 p-6 bg-success-500/10 dark:bg-success-500/5 rounded-3xl border-2 border-transparent hover:border-success-500 transition-all active:scale-95 group"
                    >
                        <div className="w-16 h-16 bg-success-500 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                            <Icon name="ArrowTrendingUpIcon" className="w-8 h-8" />
                        </div>
                        <span id="btn-add-income" className="font-bold text-success-600 dark:text-success-400">Income</span>
                    </button>

                    <button
                        onClick={() => handleAddSelect('expense')}
                        className="flex flex-col items-center justify-center gap-3 p-6 bg-danger-500/10 dark:bg-danger-500/5 rounded-3xl border-2 border-transparent hover:border-danger-500 transition-all active:scale-95 group"
                    >
                        <div className="w-16 h-16 bg-danger-500 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                            <Icon name="ArrowTrendingDownIcon" className="w-8 h-8" />
                        </div>
                        <span id="btn-add-expense" className="font-bold text-danger-600 dark:text-danger-400">Expense</span>
                    </button>

                    <button
                        onClick={() => handleAddSelect('loan')}
                        className="flex flex-col items-center justify-center gap-3 p-6 bg-midblue/10 dark:bg-midblue/5 rounded-3xl border-2 border-transparent hover:border-midblue transition-all active:scale-95 group"
                    >
                        <div className="w-16 h-16 bg-midblue rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                            <Icon name="BanknotesIcon" className="w-8 h-8" />
                        </div>
                        <span id="btn-add-loan" className="font-bold text-midblue dark:text-midblue">Loan</span>
                    </button>

                    <button
                        onClick={() => handleAddSelect('transfer')}
                        className="flex flex-col items-center justify-center gap-3 p-6 bg-purple-500/10 dark:bg-purple-500/5 rounded-3xl border-2 border-transparent hover:border-purple-500 transition-all active:scale-95 group"
                    >
                        <div className="w-16 h-16 bg-purple-500 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                            <Icon name="ArrowsRightLeftIcon" className="w-8 h-8" />
                        </div>
                        <span id="btn-add-transfer" className="font-bold text-purple-600 dark:text-purple-400">Transfer</span>
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
