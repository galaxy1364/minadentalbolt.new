import { SyncEvent, UserAccount, PlatformDevice, ClinicBackupData, Patient, Appointment, InventoryItem } from '../types/dental';

const SYNC_CHANNEL_NAME = 'minadental_mesh_sync_v1';
const STORAGE_KEY = 'minadental_clinic_db_v1';
const USERS_STORAGE_KEY = 'minadental_clinic_users_v1';
const PLATFORMS_STORAGE_KEY = 'minadental_clinic_platforms_v1';

// Initial pre-configured accounts created by Clinic Admin
// IMPORTANT: These users must be created from the Supabase Dashboard.
// Passwords are NOT stored here — they are managed exclusively by Supabase Auth.
// The password field below is a placeholder and is never used for authentication.
export const INITIAL_USERS: UserAccount[] = [
  {
    id: 'user-manager-amiri',
    username: 'dr_amiri',
    fullName: 'دکتر مهدی امیری (مدیر کلینیک و دندانپزشک معالج)',
    role: 'admin',
    assignedPlatform: 'پنل مدیریت کلینیک و یونیت ۱',
    avatarColor: '#c8ff00',
    email: 'mehdi.amiri19851364@gmail.com',
    password: '[MANAGED_BY_SUPABASE_AUTH]',
    phone: '۰۹۱۲۳۴۵۶۷۸۹',
    medicalLicense: '۱۸۴۹۲-م',
    isActive: true,
    isManager: true,
    isDoctor: true,
    isManagerAndDoctor: true,
    permissions: {
      canManageAppointments: true,
      canRegisterTreatments: true,
      canCollectPayments: true,
      canManageChecks: true,
      canAccessSettingsAndUsers: true,
      canBackupAndRestore: true,
      canEditPrices: true,
      canDeleteRecords: true,
      canManageStaff: true,
      canViewReports: true,
      canAccessLabPortal: true,
    }
  },
  {
    id: 'user-doc-rezvani',
    username: 'dr_rezvani',
    fullName: 'دکتر سارا رضوانی (متخصص ارتودنسی)',
    role: 'doctor',
    assignedPlatform: 'یونیت ۲ دندانپزشکی',
    avatarColor: '#06b6d4',
    email: 'sara.rezvani@minadental.com',
    password: '[MANAGED_BY_SUPABASE_AUTH]',
    phone: '۰۹۱۲۵۵۵۴۴۳۳',
    medicalLicense: '۲۴۹۱۰-م',
    isActive: true,
    isManager: false,
    isDoctor: true,
    isManagerAndDoctor: false,
    permissions: {
      canManageAppointments: true,
      canRegisterTreatments: true,
      canCollectPayments: false,
      canManageChecks: false,
      canAccessSettingsAndUsers: false,
      canBackupAndRestore: false,
      canEditPrices: false,
      canDeleteRecords: false,
      canManageStaff: false,
      canViewReports: false,
      canAccessLabPortal: true,
    }
  },
  {
    id: 'user-secretary',
    username: 'monshi',
    fullName: 'مریم کاظمی (منشی و پذیرش)',
    role: 'secretary',
    assignedPlatform: 'کانتر پذیرش و صندوق',
    avatarColor: '#f59e0b',
    email: 'secretary@minadental.com',
    password: '[MANAGED_BY_SUPABASE_AUTH]',
    phone: '۰۹۱۹۱۱۱۲۲۳۳',
    isActive: true,
    isManager: false,
    isDoctor: false,
    isManagerAndDoctor: false,
    permissions: {
      canManageAppointments: true,
      canRegisterTreatments: false,
      canCollectPayments: true,
      canManageChecks: true,
      canAccessSettingsAndUsers: false,
      canBackupAndRestore: true,
      canEditPrices: false, // منشی حق ویرایش تعرفه یا تخفیف ندارد مگر تایید مدیر
      canDeleteRecords: false, // منشی حق حذف سوابق ندارد
      canManageStaff: false,
      canViewReports: false,
      canAccessLabPortal: true,
    }
  },
  {
    id: 'user-assistant',
    username: 'dastyar',
    fullName: 'پریسا نوری (دستیار جراحی و استریلیزاسیون CSR)',
    role: 'assistant',
    assignedPlatform: 'اتاق استریل و جراحی',
    avatarColor: '#10b981',
    email: 'assistant@minadental.com',
    password: '[MANAGED_BY_SUPABASE_AUTH]',
    phone: '۰۹۳۵۴۴۴۳۳۲۲',
    isActive: true,
    isManager: false,
    isDoctor: false,
    isManagerAndDoctor: false,
    permissions: {
      canManageAppointments: true,
      canRegisterTreatments: false,
      canCollectPayments: false,
      canManageChecks: false,
      canAccessSettingsAndUsers: false,
      canBackupAndRestore: false,
      canEditPrices: false,
      canDeleteRecords: false,
      canManageStaff: false,
      canViewReports: false,
      canAccessLabPortal: true,
    }
  },
  {
    id: 'user-accountant',
    username: 'hesabdar',
    fullName: 'امیر حسینی (حسابدار کلینیک و امور صیاد)',
    role: 'accountant',
    assignedPlatform: 'اتاق مالی و حسابداری',
    avatarColor: '#8b5cf6',
    email: 'finance@minadental.com',
    password: '[MANAGED_BY_SUPABASE_AUTH]',
    phone: '۰۹۱۲۹۹۹۸۸۷۷',
    isActive: true,
    isManager: false,
    isDoctor: false,
    isManagerAndDoctor: false,
    permissions: {
      canManageAppointments: false,
      canRegisterTreatments: false,
      canCollectPayments: true,
      canManageChecks: true,
      canAccessSettingsAndUsers: false,
      canBackupAndRestore: true,
      canEditPrices: false,
      canDeleteRecords: false,
      canManageStaff: false,
      canViewReports: true,
      canAccessLabPortal: false,
    }
  }
];

// Initial Connected Platforms
export const INITIAL_PLATFORMS: PlatformDevice[] = [
  {
    id: 'dev-1',
    deviceName: 'سیستم پذیرش و صندوق مرکزی (ویندوز)',
    deviceType: 'desktop',
    assignedRole: 'secretary',
    assignedUser: 'مریم کاظمی (منشی)',
    lastSyncTime: 'همین الان (آنلاین)',
    isOnline: true
  },
  {
    id: 'dev-2',
    deviceName: 'تبلت یونیت ۱ (آیپد دکتر امیری)',
    deviceType: 'tablet',
    assignedRole: 'doctor',
    assignedUser: 'دکتر مهدی امیری',
    lastSyncTime: 'همین الان (آنلاین)',
    isOnline: true
  },
  {
    id: 'dev-3',
    deviceName: 'تبلت اتاق جراحی و ایمپلنت',
    deviceType: 'tablet',
    assignedRole: 'doctor',
    assignedUser: 'دستیار جراحی',
    lastSyncTime: '۲ دقیقه قبل',
    isOnline: true
  },
  {
    id: 'dev-4',
    deviceName: 'موبایل همراه مدیر کلینیک (PWA)',
    deviceType: 'mobile',
    assignedRole: 'admin',
    assignedUser: 'مدیر کلینیک',
    lastSyncTime: 'همین الان (آنلاین)',
    isOnline: true
  }
];

class SyncEngine {
  private channel: BroadcastChannel | null = null;
  private listeners: ((event: SyncEvent) => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
        this.channel.onmessage = (msg) => {
          if (msg.data && typeof msg.data === 'object') {
            this.notifyListeners(msg.data as SyncEvent);
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel initialization error:', err);
      }
    }
  }

  // Subscribe to real-time events
  public onSyncEvent(callback: (event: SyncEvent) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  // Broadcast an event across all tabs and devices
  public broadcast(event: Omit<SyncEvent, 'id' | 'timestamp'>): SyncEvent {
    const fullEvent: SyncEvent = {
      ...event,
      id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    // 1. Send via BroadcastChannel for instant multi-tab sync
    if (this.channel) {
      try {
        this.channel.postMessage(fullEvent);
      } catch (e) {
        console.warn('Channel postMessage failed:', e);
      }
    }

    // 2. Also notify local listeners
    this.notifyListeners(fullEvent);

    return fullEvent;
  }

  private notifyListeners(event: SyncEvent) {
    this.listeners.forEach(cb => {
      try {
        cb(event);
      } catch (e) {
        console.error('Error in sync listener callback:', e);
      }
    });
  }

  // Export full JSON backup
  public exportBackup(data: {
    clinicName: string;
    patients: Patient[];
    appointments: Appointment[];
    inventory: InventoryItem[];
    users: UserAccount[];
    platforms: PlatformDevice[];
  }): string {
    const backup: ClinicBackupData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      clinicName: data.clinicName,
      patients: data.patients,
      appointments: data.appointments,
      inventory: data.inventory,
      users: data.users,
      platforms: data.platforms
    };
    return JSON.stringify(backup, null, 2);
  }

  // Download local file
  public downloadBackupFile(jsonString: string, filename = 'qdent_clinic_backup.json') {
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const syncEngine = new SyncEngine();
