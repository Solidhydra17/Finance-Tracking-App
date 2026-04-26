import React, { useState } from 'react';
import { Card, CardBody, Button, Icon, Modal, Input } from '@/components/ui';
import { useCategories } from '@/hooks';
import { categoryRepository } from '@/storage/indexeddb';
import { useUIStore } from '@/store';
import type { Category } from '@/types';

export const CustomCategorySettings: React.FC = () => {
  const { categories, refetch } = useCategories('both');
  const { addToast } = useUIStore();
  
  const customCategories = categories.filter(c => c.isCustom);
  
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleEditClick = (category: Category) => {
    setEditingCategory(category);
    setEditName(category.name);
    setEditColor(category.color);
    setIsEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingCategory || !editName) return;
    
    try {
      await categoryRepository.update(editingCategory.id!, {
        name: editName,
        color: editColor
      });
      addToast('success', 'Category updated');
      setIsEditModalOpen(false);
      refetch();
    } catch (error) {
      addToast('error', 'Failed to update category');
    }
  };

  const handleDeleteClick = (category: Category) => {
    setDeletingCategory(category);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingCategory) return;
    
    try {
      await categoryRepository.delete(deletingCategory.id!);
      addToast('success', 'Category deleted');
      setIsDeleteModalOpen(false);
      refetch();
    } catch (error) {
      addToast('error', 'Failed to delete category');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="font-bold text-midblue dark:text-white uppercase text-xs tracking-widest">Custom Categories</h3>
        <span className="text-[10px] font-black text-midblue dark:text-white bg-[var(--item-bg)] px-3 py-1 rounded-full border border-[var(--card-border)]">
          {customCategories.length} TOTAL
        </span>
      </div>

      {customCategories.length === 0 ? (
        <div className="text-center py-12 bg-[var(--item-bg)] rounded-3xl border-2 border-dashed border-[var(--card-border)]">
          <Icon name="TagIcon" className="w-12 h-12 mx-auto mb-2 text-gray-200 dark:text-gray-700" />
          <p className="text-sm text-gray-400 dark:text-gray-500 font-medium px-8">
            You haven't added any custom categories yet. 
            You can add them while creating a transaction.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {customCategories.map(category => (
            <Card key={category.id} className="border-0 shadow-soft overflow-hidden group">
              <CardBody className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                    style={{ backgroundColor: category.color }}
                  >
                    <Icon name={category.icon} className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-[var(--text-main)] text-sm">{category.name}</p>
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tighter mt-0.5">
                      {category.type === 'both' ? 'Income & Expense' : category.type}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => handleEditClick(category)}
                    className="p-2 text-[var(--text-muted)] hover:text-midblue hover:bg-midblue/10 rounded-xl transition-all"
                  >
                    <Icon name="PencilIcon" className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleDeleteClick(category)}
                    className="p-2 text-[var(--text-muted)] hover:text-danger-500 hover:bg-danger-500/10 rounded-xl transition-all"
                  >
                    <Icon name="TrashIcon" className="w-5 h-5" />
                  </button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Category Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Category"
        size="sm"
        position="bottom"
      >
        <div className="space-y-6 pt-2 pb-6 px-2">
          <div className="space-y-4">
            <Input
              label="Category Name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Enter name..."
            />
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-[var(--text-muted)] ml-1">Choose Color</label>
              <div className="flex flex-wrap gap-3">
                {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#78716c'].map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setEditColor(color)}
                    className={`w-10 h-10 rounded-full transition-all active:scale-90 ${editColor === color ? 'ring-4 ring-offset-2 ring-[var(--card-border)]' : ''}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="flex-1 py-4 rounded-2xl bg-[var(--item-bg)] text-[var(--text-main)] font-bold border border-[var(--card-border)]"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdate}
              className="flex-1 py-4 rounded-2xl bg-midblue text-white font-bold shadow-lg shadow-midblue/20"
            >
              Update
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Category"
        size="sm"
        position="bottom"
      >
        <div className="space-y-6 pt-2 pb-6 px-2">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 bg-danger-500/10 rounded-full flex items-center justify-center">
              <Icon name="TrashIcon" className="w-8 h-8 text-danger-500" />
            </div>
            <div>
              <p className="font-bold text-[var(--text-main)] text-lg">Delete "{deletingCategory?.name}"?</p>
              <p className="text-[var(--text-muted)] text-sm mt-1 px-4 leading-relaxed">
                This will not delete your transactions, but they will show as "Unknown" category.
              </p>
            </div>
          </div>
          
          <div className="flex gap-3 px-2">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="flex-1 py-4 rounded-2xl bg-[var(--item-bg)] text-[var(--text-main)] font-bold border border-[var(--card-border)]"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="flex-1 py-4 rounded-2xl bg-danger-500 text-white font-bold shadow-lg shadow-danger-500/20"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
