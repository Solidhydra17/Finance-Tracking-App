import React, { useState, useEffect } from 'react';
import { Card, CardBody, Modal, Button, Icon } from '@/components/ui';
import { DayPicker } from '@/components/ui/DayPicker';
import { useReminders } from '@/hooks/useReminders';
import {
  isNotificationsSupported,
  requestNotificationPermission,
  scheduleReminders,
  getNotificationPermission,
} from '@/lib/notifications';
import { useUIStore } from '@/store';

const DAY_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function PermissionRow() {
  const [permission, setPermission] = useState<string>('loading');
  const devOptionsVisible = useUIStore((state) => state.devOptionsVisible);

  useEffect(() => {
    getNotificationPermission().then(setPermission).catch(() => setPermission('default'));
  }, []);

  if (!isNotificationsSupported()) {
    return (
      <p className="text-xs text-[var(--text-muted)] italic">
        Notifications are not supported in this browser.
      </p>
    );
  }

  if (permission === 'loading') {
    return <p className="text-xs text-[var(--text-muted)]">Checking notification status...</p>;
  }

  if (permission === 'denied') {
    return (
      <div className="p-3 bg-danger-500/10 rounded-xl border border-danger-500/20">
        <p className="text-xs text-danger-500 font-medium">
          Notifications are blocked. Go to your phone Settings → Apps → KURIPOT → Notifications to enable.
        </p>
      </div>
    );
  }

  const handleEnable = async () => {
    const granted = await requestNotificationPermission();
    setPermission(granted ? 'granted' : 'denied');
    if (granted) {
      // Re-schedule existing reminders now that permission is granted
      const stored = JSON.parse(localStorage.getItem('kuripot_reminders') || '[]');
      scheduleReminders(stored).catch(console.error);
    }
  };

  const handleTest = () => {
    const target = new Date();
    target.setSeconds(target.getSeconds() + 5); // 5 seconds delay for testing
    import('@capacitor/local-notifications').then(({ LocalNotifications }) => {
      LocalNotifications.schedule({
        notifications: [{
          id: 9999,
          title: 'KURIPOT Reminder',
          body: 'Test notification — it works! 💰',
          schedule: { at: target },
          smallIcon: 'ic_stat_kuripot',
          iconColor: '#285ccc',
        }]
      }).catch(console.error);
    });
  };

  if (permission === 'granted') {
    return (
      <div className="flex items-center justify-between p-3 bg-success-500/10 rounded-xl border border-success-500/20">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-success-500 shrink-0" />
          <p className="text-xs text-[var(--text-main)] font-bold">Notifications enabled</p>
        </div>
        {devOptionsVisible && (
          <button
            onClick={handleTest}
            className="text-xs font-bold text-success-600 dark:text-success-400 bg-success-500/20 px-3 py-1.5 rounded-lg active:scale-95 transition-all"
          >
            Test (5s)
          </button>
        )}
      </div>
    );
  }

  return (
    <Button variant="secondary" onClick={handleEnable} className="w-full text-sm">
      🔔 Enable Notifications
    </Button>
  );
}

export const ReminderSettings: React.FC = () => {
  const { reminders, addReminder, updateReminder, deleteReminder } = useReminders();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [label, setLabel] = useState('');
  const [days, setDays] = useState<number[]>([1]); // Monday default
  const [time, setTime] = useState('08:00');

  const resetForm = () => {
    setLabel('');
    setDays([1]);
    setTime('08:00');
    setEditingId(null);
  };

  const openAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEdit = (id: string) => {
    const r = reminders.find((r) => r.id === id);
    if (!r) return;
    setLabel(r.label);
    setDays([...r.days]);
    setTime(r.time);
    setEditingId(id);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (days.length === 0) return;

    if (editingId) {
      updateReminder(editingId, { label, days, time });
    } else {
      addReminder({ label, days, time, enabled: true });
    }

    setIsModalOpen(false);
    resetForm();

    // Sync to SW after a tick so state has updated
    setTimeout(() => {
      const stored: import('@/types/reminder').Reminder[] = JSON.parse(
        localStorage.getItem('kuripot_reminders') || '[]'
      );
      scheduleReminders(stored).catch(console.error);
    }, 50);
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    updateReminder(id, { enabled });
    setTimeout(() => {
      const stored: import('@/types/reminder').Reminder[] = JSON.parse(
        localStorage.getItem('kuripot_reminders') || '[]'
      );
      scheduleReminders(stored).catch(console.error);
    }, 50);
  };

  const handleDelete = async (id: string) => {
    deleteReminder(id);
    setTimeout(() => {
      const stored: import('@/types/reminder').Reminder[] = JSON.parse(
        localStorage.getItem('kuripot_reminders') || '[]'
      );
      scheduleReminders(stored).catch(console.error);
    }, 50);
  };

  return (
    <>
      <Card id="card-reminders">
        <CardBody className="space-y-4">
          <h3 className="font-bold text-midblue dark:text-white uppercase text-xs tracking-widest">
            Reminders
          </h3>

          {/* Permission status */}
          <PermissionRow />

          {/* Reminder list */}
          {reminders.length > 0 && (
            <div className="space-y-3">
              {reminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="flex items-center gap-3 p-3 bg-[var(--item-bg)] rounded-2xl border border-[var(--card-border)]"
                >
                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <p className="font-bold text-sm text-[var(--text-main)] truncate">
                      {reminder.label || 'Reminder'}
                    </p>
                    {/* Day pills */}
                    <div className="flex gap-1">
                      {DAY_SHORT.map((d, i) => (
                        <span
                          key={i}
                          className={`w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center transition-colors ${
                            reminder.days.includes(i)
                              ? 'bg-midblue text-white'
                              : 'bg-[var(--card-bg)] text-[var(--text-muted)]'
                          }`}
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-[var(--text-muted)] font-medium">{reminder.time}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Toggle */}
                    <button
                      onClick={() => handleToggle(reminder.id, !reminder.enabled)}
                      className={`w-10 h-5 rounded-full transition-colors relative flex items-center ${
                        reminder.enabled ? 'bg-midblue' : 'bg-gray-300'
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 bg-white rounded-full absolute transition-transform shadow-sm ${
                          reminder.enabled ? 'translate-x-[22px]' : 'translate-x-[3px]'
                        }`}
                      />
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => openEdit(reminder.id)}
                      className="p-1.5 rounded-lg hover:bg-[var(--card-bg)] transition-colors text-[var(--text-muted)]"
                    >
                      <Icon name="PencilSquareIcon" className="w-4 h-4" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(reminder.id)}
                      className="p-1.5 rounded-lg hover:bg-danger-500/10 transition-colors text-danger-500"
                    >
                      <Icon name="TrashIcon" className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add button */}
          <button
            onClick={openAdd}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-[var(--card-border)] text-[var(--text-muted)] text-sm font-bold hover:border-midblue hover:text-midblue transition-all active:scale-95"
          >
            + Add Reminder
          </button>
        </CardBody>
      </Card>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editingId ? 'Edit Reminder' : 'New Reminder'}
        position="bottom"
        size="md"
      >
        <div className="space-y-5 pb-6">
          {/* Label */}
          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-[var(--text-muted)] ml-1">
              Label (optional)
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Log daily expenses"
              maxLength={60}
              className="w-full h-12 px-4 rounded-xl border border-[var(--card-border)] bg-[var(--item-bg)] text-[var(--text-main)] font-medium placeholder:text-gray-400 outline-none focus:border-midblue transition-colors"
            />
          </div>

          {/* Day picker */}
          <div className="space-y-1.5">
            <DayPicker
              label="Repeat on"
              selected={days}
              onChange={setDays}
            />
            {days.length === 0 && (
              <p className="text-xs text-danger-500 ml-1">Select at least one day</p>
            )}
          </div>

          {/* Time */}
          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-[var(--text-muted)] ml-1">
              Time
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-[var(--card-border)] bg-[var(--item-bg)] text-[var(--text-main)] font-medium outline-none focus:border-midblue transition-colors"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => { setIsModalOpen(false); resetForm(); }}
              className="flex-1 py-3.5 rounded-2xl bg-[var(--item-bg)] border border-[var(--card-border)] text-[var(--text-main)] font-bold text-sm active:scale-95 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={days.length === 0}
              className="flex-1 py-3.5 rounded-2xl bg-midblue text-white font-bold text-sm active:scale-95 transition-all shadow-md shadow-midblue/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};
