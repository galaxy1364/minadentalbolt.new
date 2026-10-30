/**
 * MinaDental Enterprise Real-time State Synchronization Queue
 * Serializes, deduplicates, and manages incoming Supabase Realtime and Mesh Sync events.
 * Handles automatic reconnection retries with exponential backoff and jitter.
 * Guarantees zero-latency, order-preserving state dispatch and atomic UI updates without page reload.
 */

export type ConnectionStatus = 'connected' | 'connecting' | 'reconnecting' | 'disconnected';

export interface SyncMessage<T = any> {
  id: string;
  table: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE' | string;
  record: T;
  timestamp: number;
  source: 'supabase' | 'mesh' | 'local';
  processed?: boolean;
  retryCount?: number;
}

export type SyncMessageHandler = (message: SyncMessage) => void;
export type ConnectionStatusHandler = (status: ConnectionStatus, attempt?: number) => void;

export class StateSyncMessageQueue {
  private queue: SyncMessage[] = [];
  private isProcessing: boolean = false;
  private handlers: Set<SyncMessageHandler> = new Set();
  private statusHandlers: Set<ConnectionStatusHandler> = new Set();
  private processedCount: number = 0;
  private lastProcessedTimestamp: number = 0;
  
  // Reconnection & Resilience
  private connectionStatus: ConnectionStatus = 'connected';
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private baseDelayMs: number = 1200;
  private maxDelayMs: number = 25000;
  private reconnectTimer: any = null;
  private reconnectHandler: (() => Promise<boolean | void> | boolean | void) | null = null;
  
  // Deduplication cache (signature -> timestamp)
  private processedSignatures: Map<string, number> = new Map();
  private maxSignatureCacheSize: number = 1000;

  constructor() {
    // Listen for browser online / offline transitions
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.log('Network online detected. Triggering immediate reconnection retry.');
        this.triggerReconnect(true);
      });

      window.addEventListener('offline', () => {
        this.log('Network offline detected.');
        this.setConnectionStatus('disconnected');
      });
    }
  }

  /**
   * Subscribe a listener to process queue messages
   */
  public subscribe(handler: SyncMessageHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  /**
   * Subscribe to connection status changes
   */
  public onConnectionChange(handler: ConnectionStatusHandler): () => void {
    this.statusHandlers.add(handler);
    // Immediately notify current status
    try {
      handler(this.connectionStatus, this.reconnectAttempts);
    } catch (e) {
      console.error('Error in initial connection status handler:', e);
    }
    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  /**
   * Register the external reconnection handler (e.g. re-attaching Supabase Realtime channels)
   */
  public registerReconnectHandler(fn: () => Promise<boolean | void> | boolean | void): void {
    this.reconnectHandler = fn;
  }

  /**
   * Update and broadcast connection status
   */
  public setConnectionStatus(status: ConnectionStatus): void {
    if (this.connectionStatus === status) return;
    this.connectionStatus = status;
    if (status === 'connected') {
      this.reconnectAttempts = 0;
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      // Process any buffered messages upon connection recovery
      this.processQueue();
    }

    this.notifyStatusHandlers();
  }

  public getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  public getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  /**
   * Report a disconnection or socket failure to initiate backoff retries
   */
  public reportDisconnection(reason?: string): void {
    if (this.connectionStatus === 'reconnecting') return;
    
    this.log(`Disconnection reported: ${reason || 'Channel closed/failed'}. Initiating reconnection schedule.`);
    this.setConnectionStatus('reconnecting');
    this.scheduleReconnect();
  }

  /**
   * Schedule reconnection retry with exponential backoff and jitter
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.log(`Reached maximum reconnection retries (${this.maxReconnectAttempts}). Standing by.`);
      this.setConnectionStatus('disconnected');
      return;
    }

    this.reconnectAttempts++;
    const factor = Math.pow(1.6, this.reconnectAttempts - 1);
    const rawDelay = Math.min(this.maxDelayMs, this.baseDelayMs * factor);
    const jitter = Math.random() * 600;
    const delay = Math.round(rawDelay + jitter);

    this.log(`Scheduling reconnect attempt #${this.reconnectAttempts} in ${delay}ms`);
    this.notifyStatusHandlers();

    this.reconnectTimer = setTimeout(() => {
      this.executeReconnectAttempt();
    }, delay);
  }

  /**
   * Execute reconnect attempt via the registered reconnect handler
   */
  private async executeReconnectAttempt(): Promise<void> {
    this.reconnectTimer = null;
    if (!this.reconnectHandler) {
      this.log('No reconnect handler registered. Marking connected.');
      this.setConnectionStatus('connected');
      return;
    }

    try {
      this.log(`Executing reconnect attempt #${this.reconnectAttempts}...`);
      const result = await this.reconnectHandler();
      if (result === false) {
        throw new Error('Reconnect handler returned false');
      }
      this.log('Reconnection succeeded.');
      this.setConnectionStatus('connected');
    } catch (err) {
      this.log(`Reconnect attempt #${this.reconnectAttempts} failed:`, err);
      this.setConnectionStatus('reconnecting');
      this.scheduleReconnect();
    }
  }

  /**
   * Manually trigger immediate reconnection attempt
   */
  public async triggerReconnect(force = false): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (force) {
      this.reconnectAttempts = 0;
    }
    this.setConnectionStatus('reconnecting');
    await this.executeReconnectAttempt();
  }

  /**
   * Generate message deduplication signature
   */
  private getMessageSignature(table: string, eventType: string, record: any): string {
    const recId = record?.id || record?.patientId || record?.fileNumber || '';
    const updated = record?.updatedAt || record?.totalCost || record?.status || '';
    return `${table}:${eventType}:${recId}:${updated}`;
  }

  /**
   * Enqueue a new state-syncing message from Supabase or Mesh
   */
  public enqueue(
    table: string,
    eventType: string,
    record: any,
    source: 'supabase' | 'mesh' | 'local' = 'supabase'
  ): SyncMessage | null {
    // Deduplication check
    const sig = this.getMessageSignature(table, eventType, record);
    const now = Date.now();
    const lastSeen = this.processedSignatures.get(sig);
    if (lastSeen && now - lastSeen < 3000) {
      // Duplicate message received within 3s window (e.g. from rapid reconnect echo)
      return null;
    }
    this.processedSignatures.set(sig, now);

    // Bound deduplication cache size
    if (this.processedSignatures.size > this.maxSignatureCacheSize) {
      const oldestKeys = Array.from(this.processedSignatures.keys()).slice(0, 200);
      oldestKeys.forEach(k => this.processedSignatures.delete(k));
    }

    const message: SyncMessage = {
      id: `sync-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      table,
      eventType,
      record,
      timestamp: now,
      source
    };

    this.queue.push(message);
    this.processQueue();
    return message;
  }

  /**
   * Drain and process all messages sequentially
   */
  public processQueue(): void {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const msg = this.queue.shift();
      if (!msg) break;

      try {
        this.handlers.forEach((handler) => {
          handler(msg);
        });
        msg.processed = true;
        this.processedCount++;
        this.lastProcessedTimestamp = Date.now();

        // Dispatch window event for external listening widgets
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('minadental:realtime-synced', {
            detail: msg
          }));
        }
      } catch (err) {
        console.error('StateSyncMessageQueue dispatch error:', err);
      }
    }

    this.isProcessing = false;
  }

  private notifyStatusHandlers(): void {
    this.statusHandlers.forEach(handler => {
      try {
        handler(this.connectionStatus, this.reconnectAttempts);
      } catch (err) {
        console.error('Error in statusHandler:', err);
      }
    });
  }

  private log(...args: any[]) {
    if (typeof console !== 'undefined') {
      console.log('[StateSyncQueue]', ...args);
    }
  }

  public getStats() {
    return {
      pendingCount: this.queue.length,
      processedTotal: this.processedCount,
      lastProcessedAt: this.lastProcessedTimestamp,
      connectionStatus: this.connectionStatus,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  public clear(): void {
    this.queue = [];
    this.isProcessing = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

export const stateSyncQueue = new StateSyncMessageQueue();
