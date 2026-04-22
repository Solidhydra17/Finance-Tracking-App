import React from "react";
import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { ToastContainer, Modal } from "@/components/ui";
import { useUIStore } from "@/store";
import { AddTransactionModal } from "@/pages/AddTransactionModal";

export const AppLayout: React.FC = () => {
    const { isAddTransactionOpen, setAddTransactionOpen } = useUIStore();

    return (
        <div className="min-h-screen bg-gray-50">
            <main className="pb-20 pt-2">
                <Outlet />
            </main>

            <BottomNav onAddClick={() => setAddTransactionOpen(true)} />

            <ToastContainer />

            <Modal
                isOpen={isAddTransactionOpen}
                onClose={() => setAddTransactionOpen(false)}
                title="Add Transaction"
                size="lg"
            >
                <AddTransactionModal
                    onClose={() => setAddTransactionOpen(false)}
                />
            </Modal>
        </div>
    );
};
