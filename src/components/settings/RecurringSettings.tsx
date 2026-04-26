import React, { useState, useEffect } from 'react';
import { db } from '@/storage';
import { Card, CardBody, Button, Icon, Modal } from '@/components/ui';
import { useCategories } from '@/hooks';
import { centsToDisplay } from '@/lib/money';
import type { RecurringRule } from '@/types';
import { useUIStore } from '@/store';
import { useNavigate } from 'react-router-dom';

export const RecurringSettings: React.FC = () => {
  const navigate = useNavigate();
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const { categories } = useCategories('both');
  const { addToast } = useUIStore();
  const [editingRule, setEditingRule] = useState<RecurringRule | null>(null);
  const [ruleToDelete, setRuleToDelete] = useState<number | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const loadRules = async () => {
    const allRules = await db.recurringRules.toArray();
    setRules(allRules);
  };

  useEffect(() => {
    loadRules();
  }, []);

  const handleDelete = (id: number) => {
    setRuleToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (ruleToDelete === null) return;
    
    try {
      // 1. Detach all transactions linked to this rule
      await db.transactions
        .where('recurringRuleId')
        .equals(ruleToDelete)
        .modify({ 
          recurringRuleId: undefined,
          source: 'manual' 
        });

      // 2. Delete the rule
      await db.recurringRules.delete(ruleToDelete);
      
      addToast('success', 'Recurring series deleted');
      setIsDeleteModalOpen(false);
      setRuleToDelete(null);
      loadRules();
    } catch (error) {
      console.error('Failed to delete rule:', error);
      addToast('error', 'Failed to delete series');
    }
  };

  const getCategory = (id: number) => categories.find(c => c.id === id);

  return (
    <div id="section-recurring-settings" className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="font-bold text-midblue uppercase text-xs tracking-widest">Recurring Series</h3>
        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          {rules.length} ACTIVE
        </span>
      </div>

      {rules.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
          <p className="text-sm text-gray-400 font-medium">No recurring transactions set up yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => {
            const category = getCategory(rule.categoryId);
            return (
              <Card 
                key={rule.id} 
                className="border-0 shadow-soft overflow-hidden group active:scale-[0.98] transition-transform cursor-pointer"
                onClick={() => navigate(`/add-transaction?mode=config&ruleId=${rule.id}`)}
              >
                <CardBody className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                      style={{ backgroundColor: category?.color || '#CBD5E1' }}
                    >
                      <Icon name={category?.icon || 'ArrowPathIcon'} className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm leading-tight">{rule.description}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                        {rule.frequency} • {centsToDisplay(rule.amount)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(rule.id!);
                      }}
                      className="p-2 text-gray-300 hover:text-danger-500 hover:bg-danger-50 rounded-xl transition-all"
                    >
                      <Icon name="TrashIcon" className="w-5 h-5" />
                    </button>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
      
      <p className="text-[10px] text-gray-400 px-2 leading-tight">
        Recurring transactions are automatically added to your history when they are due.
        Editing or deleting a series will not affect transactions that were already recorded in the past.
      </p>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Series"
        size="sm"
        position="bottom"
      >
        <div className="space-y-6 pt-2 pb-6 px-2">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 bg-danger-50 rounded-full flex items-center justify-center">
              <Icon name="TrashIcon" className="w-8 h-8 text-danger-500" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-lg">Delete this recurring series?</p>
              <p className="text-gray-500 text-sm mt-1">
                Future transactions will no longer be generated. 
                <span className="block mt-1 font-bold text-gray-400">Past transactions will remain in your history.</span>
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="flex-1 py-4 rounded-2xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="flex-1 py-4 rounded-2xl bg-danger-500 text-white font-bold hover:bg-danger-600 shadow-lg shadow-danger-200 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
