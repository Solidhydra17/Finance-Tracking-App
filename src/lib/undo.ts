import { useUIStore } from '@/store/uiStore';

/** Snackbar undo window. Five seconds is the usual action-snackbar length. */
export const UNDO_MS = 5000;

let pendingUndoId: string | null = null;

export const offerUndo = (message: string, restore: () => Promise<void> | void) => {
  const store = useUIStore.getState();
  if (pendingUndoId) store.removeToast(pendingUndoId);

  const id = store.addToast('info', message, UNDO_MS, {
    label: 'Undo',
    onClick: async () => {
      pendingUndoId = null;
      try {
        await restore();
        useUIStore.getState().addToast('success', 'Restored');
      } catch (error) {
        console.error('Undo failed:', error);
        useUIStore.getState().addToast('error', 'Could not undo');
      }
    },
  });
  pendingUndoId = id;
};
