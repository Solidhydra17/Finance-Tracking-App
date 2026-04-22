import React, { useState, useCallback } from 'react';
import { Card, CardBody, Button } from '@/components/ui';
import { useUIStore } from '@/store';
import { exportAllData, clearAllData, importData, db } from '@/storage';
import { categoryRepository } from '@/storage';

export const SettingsPage: React.FC = () => {
  const { addToast } = useUIStore();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleExportJSON = useCallback(async () => {
    setIsExporting(true);
    try {
      const data = await exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `finance-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      addToast('success', 'Data exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      addToast('error', 'Failed to export data');
    } finally {
      setIsExporting(false);
    }
  }, [addToast]);

  const handleExportCSV = useCallback(async () => {
    setIsExporting(true);
    try {
      const transactions = await db.transactions.filter(t => !t.deletedAt).toArray();
      const categories = await categoryRepository.getAll();
      const headers = ['Date', 'Type', 'Amount', 'Category', 'Note', 'Source'];
      const rows = transactions.map((t) => {
        const category = categories.find((c) => c.id === t.categoryId);
        return [
          t.date,
          t.type,
          (t.amount / 100).toFixed(2),
          category?.name || 'Unknown',
          `"${(t.note || '').replace(/"/g, '""')}"`,
          t.source,
        ].join(',');
      });
      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      addToast('success', 'CSV exported successfully');
    } catch (error) {
      console.error('CSV export failed:', error);
      addToast('error', 'Failed to export CSV');
    } finally {
      setIsExporting(false);
    }
  }, [addToast]);

  const handleImport = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsImporting(true);
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        await importData(data);
        addToast('success', 'Data imported successfully');
        window.location.reload();
      } catch (error) {
        console.error('Import failed:', error);
        addToast('error', 'Failed to import data');
      } finally {
        setIsImporting(false);
      }
    };
    input.click();
  }, [addToast]);

  const handleClearData = useCallback(async () => {
    if (
      !window.confirm(
        'Are you sure you want to delete ALL data? This cannot be undone.'
      )
    ) {
      return;
    }

    setIsClearing(true);
    try {
      await clearAllData();
      addToast('success', 'All data cleared');
      window.location.reload();
    } catch (error) {
      console.error('Clear failed:', error);
      addToast('error', 'Failed to clear data');
    } finally {
      setIsClearing(false);
    }
  }, [addToast]);

  return (
    <div className="px-4 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Settings</h1>

      {/* Data Management */}
      <Card>
        <CardBody className="space-y-4">
          <h3 className="font-semibold text-gray-900">Data Management</h3>

          <div className="space-y-3">
            <Button
              variant="secondary"
              onClick={handleExportJSON}
              isLoading={isExporting}
              className="w-full"
            >
              📥 Export All Data (JSON)
            </Button>

            <Button
              variant="secondary"
              onClick={handleExportCSV}
              isLoading={isExporting}
              className="w-full"
            >
              📊 Export Transactions (CSV)
            </Button>

            <Button
              variant="secondary"
              onClick={handleImport}
              isLoading={isImporting}
              className="w-full"
            >
              📤 Import Data (JSON)
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Danger Zone */}
      <Card>
        <CardBody className="space-y-4">
          <h3 className="font-semibold text-danger-600">Danger Zone</h3>
          <p className="text-sm text-gray-500">
            Deleting all data will permanently remove all your transactions,
            loans, and recurring rules. This action cannot be undone.
          </p>
          <Button
            variant="danger"
            onClick={handleClearData}
            isLoading={isClearing}
            className="w-full"
          >
            🗑️ Delete All Data
          </Button>
        </CardBody>
      </Card>

      {/* App Info */}
      <Card>
        <CardBody>
          <h3 className="font-semibold text-gray-900 mb-2">About</h3>
          <p className="text-sm text-gray-500">
            Finance Tracker v1.0.0
          </p>
          <p className="text-sm text-gray-500">
            Offline-first personal finance management
          </p>
        </CardBody>
      </Card>
    </div>
  );
};
