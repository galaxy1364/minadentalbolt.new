/**
 * Global Clinical Multi-Level Undo / Redo Manager
 * Empowers dental staff and doctors to sequentially reverse accidental actions
 * (e.g. appointment deletion, treatment status change, payment record, or note wipe).
 * Features a multi-level LIFO stack with a limit of 15 actions.
 */

export interface UndoAction {
  id: string;
  title: string;
  description: string;
  timestamp: number;
  undo: () => void | Promise<void>;
}

export type UndoListener = (action: UndoAction | null, stackSize: number) => void;

const MAX_STACK_SIZE = 15;
const undoStack: UndoAction[] = [];
let dismissTimer: any = null;
const listeners: Set<UndoListener> = new Set();

function notifyListeners(): void {
  const topAction = undoStack.length > 0 ? undoStack[undoStack.length - 1] : null;
  listeners.forEach(cb => {
    try {
      cb(topAction, undoStack.length);
    } catch (e) {
      console.warn('Undo listener error:', e);
    }
  });
}

function startAutoDismiss(): void {
  if (dismissTimer) clearTimeout(dismissTimer);
  dismissTimer = setTimeout(() => {
    // Clear stack on timeout
    undoStack.length = 0;
    notifyListeners();
  }, 7000);
}

export const undoManager = {
  /**
   * Register a new clinical action to the undo stack
   */
  register(action: Omit<UndoAction, 'id' | 'timestamp'>): void {
    const fullAction: UndoAction = {
      ...action,
      id: `undo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      timestamp: Date.now()
    };

    undoStack.push(fullAction);
    if (undoStack.length > MAX_STACK_SIZE) {
      undoStack.shift(); // remove oldest
    }

    notifyListeners();
    startAutoDismiss();
  },

  /**
   * Execute undo for the most recent action on the stack (LIFO)
   */
  async executeUndo(): Promise<boolean> {
    if (undoStack.length === 0) return false;
    const actionToUndo = undoStack.pop()!;

    try {
      await actionToUndo.undo();
      notifyListeners();
      if (undoStack.length > 0) {
        startAutoDismiss();
      } else if (dismissTimer) {
        clearTimeout(dismissTimer);
      }
      return true;
    } catch (err) {
      console.error('Error executing undo action:', err);
      notifyListeners();
      return false;
    }
  },

  /**
   * Check if any undo actions are available
   */
  canUndo(): boolean {
    return undoStack.length > 0;
  },

  /**
   * Get the current count of actions in the stack
   */
  getStackSize(): number {
    return undoStack.length;
  },

  /**
   * Get a shallow copy of the entire stack for diagnostics
   */
  getStack(): UndoAction[] {
    return [...undoStack];
  },

  /**
   * Dismiss the active undo notification & clear the stack
   */
  dismiss(): void {
    if (dismissTimer) clearTimeout(dismissTimer);
    undoStack.length = 0;
    notifyListeners();
  },

  /**
   * Subscribe to undo events
   */
  subscribe(callback: UndoListener): () => void {
    listeners.add(callback);
    const topAction = undoStack.length > 0 ? undoStack[undoStack.length - 1] : null;
    callback(topAction, undoStack.length);
    return () => {
      listeners.delete(callback);
    };
  }
};
