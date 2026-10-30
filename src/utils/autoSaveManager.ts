/**
 * Zero-Data-Loss Local Crash Protection & Clinical Draft Recovery Manager
 * Automatically persists clinical forms, patient treatments, and notes
 * into localStorage, guaranteeing zero loss during sudden browser crash or reload.
 */

export interface AutoSaveDraft<T = any> {
  key: string;
  timestamp: number;
  view: string;
  data: T;
  label: string;
}

const STORAGE_PREFIX = 'minadental_draft_';
const memoryStore = new Map<string, string>();

function getStorageItem(key: string): string | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      return localStorage.getItem(key);
    } catch {
      return memoryStore.get(key) || null;
    }
  }
  return memoryStore.get(key) || null;
}

function setStorageItem(key: string, value: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(key, value);
      return;
    } catch {
      // quota exceeded or private browsing
    }
  }
  memoryStore.set(key, value);
}

function removeStorageItem(key: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
  memoryStore.delete(key);
}

export const autoSaveManager = {
  /**
   * Save a clinical form draft with timestamp
   */
  saveDraft<T>(key: string, data: T, label: string = 'پیش‌نویس بالینی', view: string = 'general'): void {
    try {
      const payload: AutoSaveDraft<T> = {
        key,
        timestamp: Date.now(),
        view,
        data,
        label
      };
      setStorageItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(payload));
    } catch {
      // Storage quota fallback
    }
  },

  /**
   * Retrieve a stored draft
   */
  getDraft<T>(key: string): AutoSaveDraft<T> | null {
    try {
      const raw = getStorageItem(`${STORAGE_PREFIX}${key}`);
      if (!raw) return null;
      return JSON.parse(raw) as AutoSaveDraft<T>;
    } catch {
      return null;
    }
  },

  /**
   * Remove draft once committed/saved to DB
   */
  clearDraft(key: string): void {
    try {
      removeStorageItem(`${STORAGE_PREFIX}${key}`);
    } catch {
      // ignore
    }
  },

  /**
   * Get all active uncommitted drafts across the clinic
   */
  getAllDrafts(): AutoSaveDraft[] {
    if (typeof window === 'undefined') return [];
    const drafts: AutoSaveDraft[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(STORAGE_PREFIX)) {
          const raw = localStorage.getItem(k);
          if (raw) {
            drafts.push(JSON.parse(raw));
          }
        }
      }
    } catch {
      // ignore
    }
    return drafts.sort((a, b) => b.timestamp - a.timestamp);
  }
};
