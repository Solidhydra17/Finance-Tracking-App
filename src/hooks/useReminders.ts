import { useState, useCallback } from 'react';
import type { Reminder } from '@/types/reminder';

const STORAGE_KEY = 'kuripot_reminders';

function loadReminders(): Reminder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Reminder[];
  } catch {
    return [];
  }
}

function persistReminders(reminders: Reminder[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
}

export function useReminders() {
  const [reminders, setReminders] = useState<Reminder[]>(loadReminders);

  const saveReminders = useCallback((updated: Reminder[]) => {
    persistReminders(updated);
    setReminders(updated);
  }, []);

  const addReminder = useCallback((r: Omit<Reminder, 'id'>) => {
    const newReminder: Reminder = {
      ...r,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    };
    const updated = [...loadReminders(), newReminder];
    persistReminders(updated);
    setReminders(updated);
  }, []);

  const updateReminder = useCallback((id: string, updates: Partial<Reminder>) => {
    const updated = loadReminders().map((r) =>
      r.id === id ? { ...r, ...updates } : r
    );
    persistReminders(updated);
    setReminders(updated);
  }, []);

  const deleteReminder = useCallback((id: string) => {
    const updated = loadReminders().filter((r) => r.id !== id);
    persistReminders(updated);
    setReminders(updated);
  }, []);

  return {
    reminders,
    saveReminders,
    addReminder,
    updateReminder,
    deleteReminder,
  };
}
