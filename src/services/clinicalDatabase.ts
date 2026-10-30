/**
 * @deprecated — This is the legacy IndexedDB wrapper. `indexedDbService.ts` is the primary IndexedDB service.
 * When indexedDbService is available, delegate to it instead of implementing separately.
 *
 * MinaDental Enterprise Offline Database Engine (IndexedDB + Atomic Transactions)
 * Eliminates LocalStorage 5MB quota restrictions and QuotaExceededError.
 * Provides high-capacity, atomic local storage for full clinical records, X-Rays,
 * and treatment charts.
 */

import { indexedDbService } from './indexedDbService';

const DB_NAME = 'minadental_clinical_v2';
const DB_VERSION = 1;

export interface DbStoreNames {
  patients: 'patients';
  appointments: 'appointments';
  inventory: 'inventory';
  auditLogs: 'auditLogs';
  drafts: 'drafts';
}

class ClinicalDatabase {
  private db: IDBDatabase | null = null;
  private isSupported: boolean = typeof window !== 'undefined' && 'indexedDB' in window;

  constructor() {
    if (this.isSupported) {
      this.init();
    }
  }

  private async init(): Promise<IDBDatabase | null> {
    if (this.db) return this.db;
    if (!this.isSupported) return null;

    return new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains('patients')) {
            db.createObjectStore('patients', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('appointments')) {
            db.createObjectStore('appointments', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('inventory')) {
            db.createObjectStore('inventory', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('auditLogs')) {
            db.createObjectStore('auditLogs', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('drafts')) {
            db.createObjectStore('drafts', { keyPath: 'id' });
          }
        };

        request.onsuccess = (event) => {
          this.db = (event.target as IDBOpenDBRequest).result;
          resolve(this.db);
        };

        request.onerror = (e) => {
          console.warn('ClinicalDatabase open error, falling back to storage:', e);
          resolve(null);
        };
      } catch (err) {
        console.warn('IndexedDB not accessible:', err);
        resolve(null);
      }
    });
  }

  /**
   * Save items atomically inside an IndexedDB store
   */
  public async set<T>(storeName: string, key: string, value: T): Promise<boolean> {
    const db = await this.init();
    if (!db) {
      try {
        localStorage.setItem(`minadental_${storeName}_${key}`, JSON.stringify(value));
        return true;
      } catch (e) {
        console.warn('Storage fallback failed:', e);
        return false;
      }
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction([storeName], 'readwrite');
        const store = tx.objectStore(storeName);
        store.put({ id: key, data: value, updatedAt: Date.now() });

        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * Retrieve an item by key from an IndexedDB store
   */
  public async get<T>(storeName: string, key: string): Promise<T | null> {
    const db = await this.init();
    if (!db) {
      try {
        const item = localStorage.getItem(`minadental_${storeName}_${key}`);
        return item ? JSON.parse(item) : null;
      } catch {
        return null;
      }
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction([storeName], 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.get(key);

        request.onsuccess = () => {
          resolve(request.result?.data || null);
        };
        request.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  /**
   * Bulk save all patients. Delegates to indexedDbService (primary service) when available.
   */
  public async saveAllPatients(patients: any[]): Promise<boolean> {
    // Delegate to the primary IndexedDB service
    try {
      await indexedDbService.bulkSavePatients(patients as any[]);
      return true;
    } catch {
      // Fall back to legacy implementation
      return this.set('patients', 'all_patients_cache', patients);
    }
  }

  /**
   * Get all patients. Delegates to indexedDbService (primary service) when available.
   */
  public async getAllPatients(): Promise<any[] | null> {
    // Delegate to the primary IndexedDB service
    try {
      const result = await indexedDbService.getAllPatients();
      if (result && result.length > 0) return result;
    } catch {
      // Fall back to legacy implementation
    }
    return this.get<any[]>('patients', 'all_patients_cache');
  }
}

export const clinicalDb = new ClinicalDatabase();
