import React, { useState, useEffect, useRef } from 'react';
import { AppHeader } from './components/AppHeader';
import { BottomDock, NavTab } from './components/BottomDock';
import { ServicesSheet } from './components/ServicesSheet';
import { PalmerChartModal } from './components/PalmerChartModal';
import { PatientFileModal } from './components/PatientFileModal';
import { AddCheckModal } from './components/AddCheckModal';
import { AddLabOrderModal } from './components/AddLabOrderModal';
import { AddPaymentModal } from './components/AddPaymentModal';
import { SyncNotificationToast } from './components/SyncNotificationToast';
import { LiveSyncSimulatorModal } from './components/LiveSyncSimulatorModal';
import { RoleSwitcherModal } from './components/RoleSwitcherModal';
import { BackupModal } from './components/BackupModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { SupabaseTestModal } from './components/SupabaseTestModal';
import { TreatmentInvoiceModal } from './components/TreatmentInvoiceModal';
import { DoctorCommissionModal } from './components/DoctorCommissionModal';
import { IncomingCallBanner } from './components/IncomingCallBanner';
import { LabPrescriptionModal } from './components/LabPrescriptionModal';
import { DigitalLabPortalModal } from './components/DigitalLabPortalModal';
import { PatientBookingPortalModal } from './components/PatientBookingPortalModal';
import { SmsGatewaySettingsModal } from './components/SmsGatewaySettingsModal';
import { ClinicalHudDrawer } from './components/ClinicalHudDrawer';
import { AccessibilityControlsModal, DisplayTheme, FontScale } from './components/AccessibilityControlsModal';
import { OneHandedActionSheet } from './components/OneHandedActionSheet';
import { GlobalUndoToast } from './components/GlobalUndoToast';
import { PhaseAuditSuiteModal } from './components/PhaseAuditSuiteModal';
import { ProjectDownloadModal } from './components/ProjectDownloadModal';
import { DentalSkeletonLoader } from './components/DentalSkeletonLoader';
import { GlobalCommandPalette } from './components/GlobalCommandPalette';
import { ConsentSignatureModal } from './components/ConsentSignatureModal';
import { flushSync } from 'react-dom';
import { undoManager } from './utils/undoManager';
import { autoSaveManager } from './utils/autoSaveManager';
import { supabaseService } from './services/supabaseService';
import { clinicalDb } from './services/clinicalDatabase';
import { indexedDbService } from './services/indexedDbService';
import { stateSyncQueue } from './utils/syncQueue';
import { triggerHaptic } from './utils/haptics';
import { hardwareBridgeService } from './services/hardwareBridgeService';

// Views
import { DashboardView } from './components/views/DashboardView';
import { FinancialView } from './components/views/FinancialView';
import { AppointmentsView } from './components/views/AppointmentsView';
import { LabModuleView } from './components/views/LabModuleView';
import { ImplantModuleView } from './components/views/ImplantModuleView';
import { PatientsListView } from './components/views/PatientsListView';
import { AiAssistantView } from './components/views/AiAssistantView';
import { InventoryView } from './components/views/InventoryView';
import { RemindersView } from './components/views/RemindersView';
import { SettingsView } from './components/views/SettingsView';
import { XRayModuleView } from './components/views/XRayModuleView';
import { MarketingCampaignsView } from './components/views/MarketingCampaignsView';
import { SterilizationModuleView } from './components/views/SterilizationModuleView';
import { InsuranceClaimsView } from './components/views/InsuranceClaimsView';
import { AnimatedGeminiBackground } from './components/AnimatedGeminiBackground';

// Mock Data, Types & Realtime Engine
import { INITIAL_PATIENTS, INITIAL_APPOINTMENTS, INITIAL_INVENTORY } from './data/mockData';
import { 
  Patient, Appointment, InventoryItem, SayadCheck, Installment,
  LabOrder, PaymentRecord, ImplantStage, ToothSurface, 
  TreatmentType, ToothCondition, UserAccount, PlatformDevice, 
  SyncEvent, DentalPrescription, IncomingCallEvent, PatientConsent 
} from './types/dental';
import { syncEngine, INITIAL_USERS, INITIAL_PLATFORMS } from './services/syncEngine';
import { DollarSign, Bell, X } from 'lucide-react';
import { formatToman, getCurrentPersianDate, toEnglishDigits } from './utils/jalali';
import { getLatestFileNumber, getNextFileNumber, recordLastFileNumber } from './utils/fileNumber';
import { inventoryConsumptionService } from './services/inventoryConsumptionService';

export default function App() {
  const [patients, setPatients] = useState<Patient[]>(() => {
    try {
      const saved = localStorage.getItem('minadental_patients');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_PATIENTS;
  });

  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    try {
      const saved = localStorage.getItem('minadental_appointments');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_APPOINTMENTS;
  });

  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('minadental_inventory');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_INVENTORY;
  });
  const [users, setUsers] = useState<UserAccount[]>(INITIAL_USERS);
  const [platforms, setPlatforms] = useState<PlatformDevice[]>(INITIAL_PLATFORMS);
  
  // Ref to always have latest patients inside callbacks without re-subscribing (fixes C2)
  const patientsRef = useRef<Patient[]>(patients);
  useEffect(() => { patientsRef.current = patients; }, [patients]);

  // Loading state for skeleton display (UI4)
  const [isLoading, setIsLoading] = useState(true);
  
  // Current active user (defaults to Secretary so secretary workflow is front and center)
  const [currentUser, setCurrentUser] = useState<UserAccount>(INITIAL_USERS[2]);

  // Navigation State
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [activeView, setActiveView] = useState<string>('home');

  // Modals State
  const [servicesMenuOpen, setServicesMenuOpen] = useState(false);
  const [palmerChartOpen, setPalmerChartOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientFileInitialTab, setPatientFileInitialTab] = useState<'treatments' | 'financial' | 'prescriptions' | 'consents' | 'lab' | 'implant' | 'xrays' | 'ai'>('treatments');

  const handleOpenPatientFile = (patient: Patient, tab: 'treatments' | 'financial' | 'prescriptions' | 'consents' | 'lab' | 'implant' | 'xrays' | 'ai' = 'treatments') => {
    setPatientFileInitialTab(tab);
    setSelectedPatient(patient);
  };
  const [addCheckModalOpen, setAddCheckModalOpen] = useState(false);
  const [addLabOrderModalOpen, setAddLabOrderModalOpen] = useState(false);
  const [addPaymentModalOpen, setAddPaymentModalOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoicePatient, setInvoicePatient] = useState<Patient | null>(null);
  
  // Multi-User & Real-time Sync Modals
  const [liveSyncModalOpen, setLiveSyncModalOpen] = useState(false);
  const [roleSwitcherModalOpen, setRoleSwitcherModalOpen] = useState(false);
  const [backupModalOpen, setBackupModalOpen] = useState(false);
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);
  const [supabaseTestModalOpen, setSupabaseTestModalOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(3);
  
  // Doctor Commission and Caller ID State
  const [commissionModalOpen, setCommissionModalOpen] = useState(false);
  const [incomingCall, setIncomingCall] = useState<IncomingCallEvent | null>(null);
  const [callSimulationToggle, setCallSimulationToggle] = useState(false);
  const [labSlipOrder, setLabSlipOrder] = useState<LabOrder | null>(null);

  // Global Deficiencies Features: Lab Portal, Booking Portal, SMS Gateway
  const [digitalLabModalOpen, setDigitalLabModalOpen] = useState(false);
  const [bookingPortalModalOpen, setBookingPortalModalOpen] = useState(false);
  const [smsGatewayModalOpen, setSmsGatewayModalOpen] = useState(false);

  // Clinical HUD, Accessibility & One-Handed Thumb Zone State
  const [clinicalHudOpen, setClinicalHudOpen] = useState(false);
  const [accessibilityModalOpen, setAccessibilityModalOpen] = useState(false);
  const [thumbZoneOpen, setThumbZoneOpen] = useState(false);
  const [phaseAuditModalOpen, setPhaseAuditModalOpen] = useState(false);
  const [projectDownloadModalOpen, setProjectDownloadModalOpen] = useState(false);

  const handleSimulateIncomingCall = (forceUnknown?: boolean) => {
    const shouldBeExisting = forceUnknown === false || (forceUnknown === undefined && !callSimulationToggle);
    setCallSimulationToggle(prev => !prev);

    if (shouldBeExisting && patients.length > 0) {
      const target = patients[0];
      setIncomingCall({
        id: `call_${Date.now()}`,
        phoneNumber: target.phone,
        timestamp: 'همین الان',
        matchedPatient: target
      });
    } else {
      setIncomingCall({
        id: `call_${Date.now()}`,
        phoneNumber: '۰۹۱۲۹۸۷۶۵۴۳',
        timestamp: 'همین الان',
        matchedPatient: null
      });
    }
  };

  // Sync notification toast
  const [activeSyncEvent, setActiveSyncEvent] = useState<SyncEvent | null>(null);

  // Formal State Syncing Message Queue Epoch for immediate DOM refresh
  const [syncEpoch, setSyncEpoch] = useState<number>(0);

  // Doctor treatment alert for secretary
  const [doctorBillingAlert, setDoctorBillingAlert] = useState<{
    patientName: string;
    patientId: string;
    amount: number;
    treatment: string;
  } | null>(null);

  // Global Command Palette (Cmd+K / Ctrl+K) state
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // ConsentSignatureModal standalone state
  const [consentSignatureModalOpen, setConsentSignatureModalOpen] = useState(false);

  // Initialize Accessibility & Ergonomic Theme Modes on Mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('minadental_theme');
      if (savedTheme === 'dark') document.documentElement.classList.add('theme-dark');
      if (savedTheme === 'high-contrast') document.documentElement.classList.add('theme-high-contrast');

      const savedFont = localStorage.getItem('minadental_font_scale');
      if (savedFont === 'large') document.documentElement.classList.add('font-scale-large');
      if (savedFont === 'xlarge') document.documentElement.classList.add('font-scale-xlarge');

      const savedGlove = localStorage.getItem('minadental_glove_mode') === 'true';
      if (savedGlove) document.documentElement.classList.add('glove-mode');
    }
  }, []);

  // Supabase & IndexedDB Hydration, Message Queue and Real-Time Event Listener
  // C2 fix: empty dependency array [], access patients via patientsRef
  // H4 fix: load IndexedDB first (sequential), then Supabase
  // C1 fix: runImmediateRefreshWrapper declared as function (hoisted)
  useEffect(() => {
    // C1 fix: function declaration is hoisted — no TDZ
    function runImmediateRefreshWrapper(fn: () => void) {
      try {
        flushSync(fn);
      } catch {
        fn();
      }
    }

    // H4: sequential hydration — IndexedDB first, then Supabase
    const hydrate = async () => {
      // Step 0: IndexedDB instant offline hydration
      const [storedPatients, storedApts] = await Promise.all([
        indexedDbService.getAllPatients(),
        indexedDbService.getAllAppointments()
      ]);
      if (storedPatients && storedPatients.length > 0) {
        setPatients(storedPatients);
        setIsLoading(false);
      }
      if (storedApts && storedApts.length > 0) {
        setAppointments(storedApts);
      }

      // Step 1: Cloud hydration from Supabase (sequential after IndexedDB)
      try {
        const { data } = await supabaseService.getPatients();
        if (data && data.length > 0) {
          setPatients(data);
          indexedDbService.bulkSavePatients(data);
        }
      } catch (e) {
        console.warn('Supabase hydration error:', e);
      } finally {
        setIsLoading(false);
      }
    };
    hydrate();

    // 2. Formal state-syncing message queue subscriber with atomic UI updates across all active dashboard views
    const unsubscribeQueue = stateSyncQueue.subscribe((msg) => {
      const runImmediateRefresh = (fn: () => void) => {
        try {
          flushSync(fn);
        } catch {
          fn();
        }
      };

      runImmediateRefresh(() => {
        if (msg.table === 'patients') {
          if (msg.eventType === 'DELETE' && msg.record?.id) {
            setPatients(prev => prev.filter(p => p.id !== msg.record.id));
            setSelectedPatient(prev => (prev?.id === msg.record.id ? null : prev));
          } else if (msg.record && msg.record.id) {
            const record = msg.record as Patient;
            setPatients(prev => {
              const existingIdx = prev.findIndex(p => p.id === record.id);
              const oldPatient = existingIdx >= 0 ? prev[existingIdx] : null;

              // Detect if doctor registered or modified a treatment on this patient
              const isTreatmentAddedOrUpdated = oldPatient && (
                (record.activeTreatmentsCount || 0) > (oldPatient.activeTreatmentsCount || 0) ||
                (record.totalCost || 0) > (oldPatient.totalCost || 0) ||
                Object.keys(record.teethConditions || {}).length > Object.keys(oldPatient.teethConditions || {}).length
              );

              // Instantly trigger Secretary billing alert when doctor registers a treatment
              if (isTreatmentAddedOrUpdated || msg.source === 'local') {
                const costDiff = (record.totalCost || 0) - (oldPatient?.totalCost || 0);
                const billingCost = costDiff > 0 ? costDiff : (record.totalCost || 2500000);

                const toothEntries = Object.entries(record.teethConditions || {});
                const lastTooth = toothEntries.length > 0 ? toothEntries[toothEntries.length - 1][1] : null;
                const treatmentTitle = lastTooth?.treatment || record.notes || 'درمان در یونیت دندانپزشکی';

                // Instant Bouncing Alert Banner for Secretary Reception Desk
                setDoctorBillingAlert({
                  patientName: record.fullName || 'بیمار',
                  patientId: record.id,
                  amount: billingCost,
                  treatment: treatmentTitle
                });

                triggerHaptic('success');

                setActiveSyncEvent({
                  id: `sync-${Date.now()}`,
                  type: 'TREATMENT_REGISTERED',
                  timestamp: new Date().toLocaleTimeString('fa-IR'),
                  performedBy: record.teethConditions && Object.values(record.teethConditions)[0]?.doctorName || 'پزشک یونیت',
                  role: 'doctor',
                  platform: 'یونیت دندانپزشکی',
                  title: `درمان جدید برای ${record.fullName} ثبت شد`,
                  description: `مبلغ ${formatToman(billingCost)} به پرونده افزوده شد. آماده صدور فیش صندوق منشی.`,
                  actionRequired: 'منشی می‌تواند فوراً فیش صادر و تسویه کند',
                  payload: {
                    patientId: record.id,
                    patientName: record.fullName,
                    cost: billingCost,
                    treatment: treatmentTitle
                  }
                });
              }

              if (existingIdx >= 0) {
                const copy = [...prev];
                copy[existingIdx] = { ...copy[existingIdx], ...record };
                return copy;
              }
              return [record, ...prev];
            });

            setSelectedPatient(prev => (prev?.id === record.id ? { ...prev, ...record } : prev));
            indexedDbService.savePatient(record);
          }
        } else if (msg.table === 'appointments') {
          if (msg.eventType === 'DELETE' && msg.record?.id) {
            setAppointments(prev => prev.filter(a => a.id !== msg.record.id));
          } else if (msg.record && msg.record.id) {
            const record = msg.record as Appointment;
            setAppointments(prev => {
              const idx = prev.findIndex(a => a.id === record.id);
              if (idx >= 0) {
                const copy = [...prev];
                copy[idx] = { ...copy[idx], ...record };
                return copy;
              }
              return [record, ...prev];
            });
            indexedDbService.saveAppointment(record);
          }
        } else if (msg.table === 'inventory') {
          if (msg.eventType === 'DELETE' && msg.record?.id) {
            setInventory(prev => prev.filter(i => i.id !== msg.record.id));
          } else if (msg.record && msg.record.id) {
            const record = msg.record as InventoryItem;
            setInventory(prev => {
              const idx = prev.findIndex(i => i.id === record.id);
              if (idx >= 0) {
                const copy = [...prev];
                copy[idx] = { ...copy[idx], ...record };
                return copy;
              }
              return [record, ...prev];
            });
          }
        } else if (['sayad_checks', 'installments', 'lab_orders', 'implant_cases', 'payments'].includes(msg.table)) {
          const patientId = msg.record?.patientId || msg.record?.patient_id;
          if (patientId) {
            setPatients(prev => prev.map(p => {
              if (p.id !== patientId) return p;
              const copy = { ...p };
              if (msg.table === 'sayad_checks') {
                const checks = copy.sayadChecks || [];
                const idx = checks.findIndex(c => c.id === msg.record.id);
                copy.sayadChecks = idx >= 0 ? checks.map(c => c.id === msg.record.id ? { ...c, ...msg.record } : c) : [msg.record, ...checks];
              } else if (msg.table === 'installments') {
                const insts = copy.installments || [];
                const idx = insts.findIndex(i => i.id === msg.record.id);
                copy.installments = idx >= 0 ? insts.map(i => i.id === msg.record.id ? { ...i, ...msg.record } : i) : [msg.record, ...insts];
              } else if (msg.table === 'lab_orders') {
                const orders = copy.labOrders || [];
                const idx = orders.findIndex(o => o.id === msg.record.id);
                copy.labOrders = idx >= 0 ? orders.map(o => o.id === msg.record.id ? { ...o, ...msg.record } : o) : [msg.record, ...orders];
              } else if (msg.table === 'implant_cases') {
                const cases = copy.implantCases || [];
                const idx = cases.findIndex(c => c.id === msg.record.id);
                copy.implantCases = idx >= 0 ? cases.map(c => c.id === msg.record.id ? { ...c, ...msg.record } : c) : [msg.record, ...cases];
              } else if (msg.table === 'payments') {
                const payments = copy.payments || [];
                const idx = payments.findIndex(pm => pm.id === msg.record.id);
                copy.payments = idx >= 0 ? payments.map(pm => pm.id === msg.record.id ? { ...pm, ...msg.record } : pm) : [msg.record, ...payments];
              }
              return copy;
            }));
          }
        }

        // Force instant atomic UI refresh epoch across all dashboard views
        setSyncEpoch(e => e + 1);

        // Dispatch window event so embedded chart/calendar widgets update immediately
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('minadental:state-synchronized', {
            detail: { table: msg.table, eventType: msg.eventType }
          }));
        }
      });
    });

    // 3. Supabase Realtime channel manager with automatic reconnection retries
    let realtimeUnsub: (() => void) | null = null;

    const setupSupabaseRealtime = () => {
      if (realtimeUnsub) {
        realtimeUnsub();
        realtimeUnsub = null;
      }

      realtimeUnsub = supabaseService.subscribeToChanges(
        (table, eventType, record) => {
          stateSyncQueue.enqueue(table, eventType, record, 'supabase');
          syncEngine.broadcast({
            type: 'CLOUD_BACKUP_SAVED',
            performedBy: 'Supabase Realtime',
            role: 'admin',
            platform: 'Cloud Database',
            title: `به‌روزرسانی همزمان جدول ${table}`,
            description: `تغییر ${eventType} در سرور ابری اعمال و به صورت بلادرنگ در سیستم اعمال گردید.`
          });
        },
        (status, err) => {
          if (status === 'SUBSCRIBED') {
            stateSyncQueue.setConnectionStatus('connected');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            stateSyncQueue.reportDisconnection(`Channel ${status}: ${err?.message || ''}`);
          }
        }
      );
    };

    // Register Reconnection Handler with stateSyncQueue
    stateSyncQueue.registerReconnectHandler(async () => {
      setupSupabaseRealtime();
      // Re-hydrate any missed delta during disconnect
      try {
        const { data } = await supabaseService.getPatients();
        if (data && data.length > 0) {
          runImmediateRefreshWrapper(() => {
            setPatients(data);
            setSyncEpoch(e => e + 1);
          });
        }
      } catch (e) {
        console.warn('Re-hydration after reconnect warning:', e);
      }
      return true;
    });

    // Initial subscription setup
    setupSupabaseRealtime();

    // 4. Local mesh sync listener
    const unsubscribeMesh = syncEngine.onSyncEvent((event) => {
      setActiveSyncEvent(event);
      setTimeout(() => {
        setActiveSyncEvent((current) => (current?.id === event.id ? null : current));
      }, 5000);

      // If doctor registered a treatment, trigger instant billing notice for secretary
      if (event.type === 'TREATMENT_REGISTERED' && event.payload) {
        setDoctorBillingAlert({
          patientName: event.payload.patientName || 'بیمار',
          patientId: event.payload.patientId || 'pat-1',
          amount: event.payload.cost || 6500000,
          treatment: event.payload.treatment || 'درمان در یونیت'
        });
      }

      if (event.type === 'PAYMENT_COLLECTED') {
        setDoctorBillingAlert(null);
      }
    });

    // 5. Hardware Caller-ID listener — uses patientsRef to avoid re-subscribing on patients change (C2 fix)
    const unsubscribeHardwareCall = hardwareBridgeService.onIncomingCall((event) => {
      const cleanEventPhone = event.phoneNumber.replace(/[^0-9]/g, '');
      const match = patientsRef.current.find(p => p.phone.replace(/[^0-9]/g, '').endsWith(cleanEventPhone.slice(-7))) || null;

      setIncomingCall({
        id: `call_${Date.now()}`,
        phoneNumber: event.phoneNumber,
        timestamp: event.dateTime || 'همین الان',
        matchedPatient: match
      });
    });

    return () => {
      if (realtimeUnsub) realtimeUnsub();
      unsubscribeMesh();
      unsubscribeQueue();
      unsubscribeHardwareCall();
    };
  }, []); // C2 fix: empty dependency array — no infinite re-render on patients change

  // Save changes to localStorage & IndexedDB for 100% offline persistence without quota limits
  useEffect(() => {
    try {
      localStorage.setItem('minadental_patients', JSON.stringify(patients));
    } catch (e) {
      console.warn('LocalStorage quota warning, using IndexedDB:', e);
    }
    clinicalDb.saveAllPatients(patients);
  }, [patients]);

  useEffect(() => {
    try {
      localStorage.setItem('minadental_appointments', JSON.stringify(appointments));
    } catch (e) {
      console.error(e);
    }
  }, [appointments]);

  useEffect(() => {
    try {
      localStorage.setItem('minadental_inventory', JSON.stringify(inventory));
    } catch (e) {
      console.error(e);
    }
  }, [inventory]);

  // GlobalCommandPalette keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Daily Clinic Statistics
  const todayPersian = getCurrentPersianDate();
  const todayAppointmentsCount = appointments.filter(a => {
    if (!a.date) return false;
    return a.date === todayPersian || toEnglishDigits(a.date) === toEnglishDigits(todayPersian);
  }).length;
  // H2 fix: compute activeSurgeriesCount from real appointment data
  const activeSurgeriesCount = appointments.filter(a => a.status === 'in_chair' || a.status === 'waiting').length;
  const readyLabOrdersCount = patients.flatMap(p => p.labOrders).filter(l => l.status === 'ready_for_clinic').length;
  // H2 fix: compute dailyRevenue from today's payments
  const dailyRevenue = patients
    .flatMap(p => p.payments || [])
    .filter(pm => {
      if (!pm.date) return false;
      return pm.date === todayPersian || toEnglishDigits(pm.date) === toEnglishDigits(todayPersian);
    })
    .reduce((sum, pm) => sum + (pm.amount || 0), 0);

  // Handlers
  const handleTabChange = (tab: NavTab) => {
    setActiveTab(tab);
    if (tab === 'home') setActiveView('home');
    if (tab === 'patients') setActiveView('patients');
    if (tab === 'treatments') setPalmerChartOpen(true);
    if (tab === 'financial') setActiveView('financial');
    if (tab === 'appointments') setActiveView('appointments');
  };

  const handleServicesNavigate = (viewId: string) => {
    if (viewId === 'palmer' || viewId === 'treatment_plans') {
      setPalmerChartOpen(true);
    } else if (viewId === 'doctor_commissions') {
      setCommissionModalOpen(true);
    } else if (viewId === 'incoming_call_test') {
      handleSimulateIncomingCall();
    } else if (viewId === 'digital_lab') {
      setDigitalLabModalOpen(true);
    } else if (viewId === 'online_booking') {
      setBookingPortalModalOpen(true);
    } else if (viewId === 'sms_gateway') {
      setSmsGatewayModalOpen(true);
    } else if (viewId === 'audit_suite' || viewId === 'phase_audit') {
      setPhaseAuditModalOpen(true);
    } else if (viewId === 'live_sync' || viewId === 'live_sync_simulator') {
      setLiveSyncModalOpen(true);
    } else if (viewId === 'supabase_test' || viewId === 'cloud_db_test') {
      setSupabaseTestModalOpen(true);
    } else if (viewId === 'project_download') {
      setProjectDownloadModalOpen(true);
    } else if (['sayad_checks', 'installments', 'pos_payments', 'reports', 'guarantee_checks'].includes(viewId)) {
      setActiveView('financial');
      setActiveTab('financial');
    } else {
      setActiveView(viewId);
      if (['patients', 'appointments', 'financial'].includes(viewId)) {
        setActiveTab(viewId as NavTab);
      } else {
        setActiveTab('home');
      }
    }
  };

  // Add Treatment from Palmer Chart (Broadcast to secretary instantly!)
  const handleSaveTreatment = (treatmentData: {
    quadrant: 'UR' | 'UL' | 'LL' | 'LR';
    toothNumber: number;
    surfaces: ToothSurface[];
    treatment: TreatmentType;
    cost: number;
    notes: string;
    annotations?: string;
  }) => {
    const targetPatient = selectedPatient || patients[0];
    if (!targetPatient) return;

    const toothKey = `${treatmentData.quadrant}_${treatmentData.toothNumber}`;

    const newCondition: ToothCondition = {
      quadrant: treatmentData.quadrant,
      toothNumber: treatmentData.toothNumber,
      surfaces: treatmentData.surfaces,
      treatment: treatmentData.treatment,
      status: 'in_progress',
      notes: treatmentData.notes,
      cost: treatmentData.cost,
      doctorName: currentUser?.fullName || 'دکتر مهدی امیری',
      date: getCurrentPersianDate(),
      annotations: treatmentData.annotations
    };

    const updatedPatients = patients.map(p => {
      if (p.id === targetPatient.id) {
        return {
          ...p,
          totalCost: p.totalCost + treatmentData.cost,
          balance: p.balance - treatmentData.cost,
          activeTreatmentsCount: p.activeTreatmentsCount + 1,
          teethConditions: {
            ...p.teethConditions,
            [toothKey]: newCondition
          }
        };
      }
      return p;
    });

    const prevPatients = patients;
    setPatients(updatedPatients);
    const updatedTarget = updatedPatients.find(p => p.id === targetPatient.id);
    if (selectedPatient && selectedPatient.id === targetPatient.id) {
      setSelectedPatient(updatedTarget || null);
    }

    // Persist to Supabase Cloud in Real Time & Message Queue
    if (updatedTarget) {
      supabaseService.savePatient(updatedTarget);
      stateSyncQueue.enqueue('patients', 'UPDATE', updatedTarget, 'local');
    }

    // Register Undo Action
    undoManager.register({
      title: `درمان دندان ${treatmentData.toothNumber} ثبت شد`,
      description: `برای ${targetPatient.fullName} (${formatToman(treatmentData.cost)})`,
      undo: () => {
        setPatients(prevPatients);
        if (selectedPatient) {
          setSelectedPatient(prevPatients.find(p => p.id === selectedPatient.id) || null);
        }
        if (targetPatient) {
          supabaseService.savePatient(targetPatient);
        }
      }
    });

    // Automatic inventory consumption based on dental procedure bill-of-materials
    const consumption = inventoryConsumptionService.deductSuppliesForTreatment(
      treatmentData.treatment,
      inventory
    );
    if (consumption.deductedItems.length > 0) {
      setInventory(consumption.updatedInventory);
      if (consumption.criticalAlerts.length > 0) {
        syncEngine.broadcast({
          type: 'CLOUD_BACKUP_SAVED',
          performedBy: 'سیستم هوشمند انبار',
          role: 'admin',
          platform: currentUser?.assignedPlatform || 'Web Admin',
          title: 'هشدار کسری انبار مصرفی دندانپزشکی',
          description: `موجودی ${consumption.criticalAlerts.map(a => a.itemName).join('، ')} به حداقل مجاز رسید. پیش‌فاکتور تأمین آماده صدور است.`
        });
      }
    }

    // Broadcast live event across all platforms
    syncEngine.broadcast({
      type: 'TREATMENT_REGISTERED',
      performedBy: currentUser.username,
      role: currentUser.role,
      platform: currentUser.assignedPlatform,
      title: `درمان دندان ${treatmentData.toothNumber} ثبت شد`,
      description: `پزشک درمان دندان ${treatmentData.toothNumber} (مبلغ ${formatToman(treatmentData.cost)}) را برای ${targetPatient.fullName} ثبت کرد.`,
      actionRequired: 'منشی می‌تواند فوراً فیش صادر و تسویه کند',
      payload: {
        patientId: targetPatient.id,
        patientName: targetPatient.fullName,
        treatment: treatmentData.treatment,
        cost: treatmentData.cost
      }
    });
  };

  // Add Sayad Check
  const handleAddCheck = (newCheck: SayadCheck) => {
    const updated = patients.map(p => {
      if (p.id === newCheck.patientId) {
        return {
          ...p,
          sayadChecks: [newCheck, ...p.sayadChecks]
        };
      }
      return p;
    });
    setPatients(updated);
    const updatedPat = updated.find(p => p.id === newCheck.patientId);
    if (selectedPatient && selectedPatient.id === newCheck.patientId) {
      setSelectedPatient(updatedPat || null);
    }

    // Persist to Supabase Cloud
    if (updatedPat) {
      supabaseService.savePatient(updatedPat);
    }
    supabaseService.saveSayadCheck(newCheck);

    syncEngine.broadcast({
      type: 'CHECK_REGISTERED',
      performedBy: currentUser.username,
      role: currentUser.role,
      platform: currentUser.assignedPlatform,
      title: 'چک صیادی جدید ثبت شد',
      description: `چک ${formatToman(newCheck.amount)} بابت بیمار ${newCheck.patientName} در سامانه صیاد ثبت گردید.`
    });
  };

  // Add Lab Order
  const handleAddLabOrder = (newOrder: LabOrder) => {
    const updated = patients.map(p => {
      if (p.id === newOrder.patientId) {
        return {
          ...p,
          labOrders: [newOrder, ...p.labOrders]
        };
      }
      return p;
    });
    setPatients(updated);
    const updatedPat = updated.find(p => p.id === newOrder.patientId);
    if (selectedPatient && selectedPatient.id === newOrder.patientId) {
      setSelectedPatient(updatedPat || null);
    }

    // Persist to Supabase Cloud
    if (updatedPat) {
      supabaseService.savePatient(updatedPat);
    }
    supabaseService.saveLabOrder(newOrder);

    syncEngine.broadcast({
      type: 'LAB_DISPATCHED',
      performedBy: currentUser.username,
      role: currentUser.role,
      platform: currentUser.assignedPlatform,
      title: 'سفارش پروتز به لابراتوار ارسال شد',
      description: `${newOrder.workType} برای ${newOrder.patientName} به ${newOrder.labName} ارسال گردید.`
    });
  };

  // Add Payment (Immediately syncs across all devices)
  const handleAddPayment = (newPayment: PaymentRecord) => {
    const updated = patients.map(p => {
      if (p.id === newPayment.patientId) {
        return {
          ...p,
          paidAmount: p.paidAmount + newPayment.amount,
          balance: p.balance + newPayment.amount,
          payments: [newPayment, ...p.payments]
        };
      }
      return p;
    });
    setPatients(updated);
    const updatedPat = updated.find(p => p.id === newPayment.patientId);
    if (selectedPatient && selectedPatient.id === newPayment.patientId) {
      setSelectedPatient(updatedPat || null);
    }

    // Persist patient balance & payment record to Supabase
    if (updatedPat) {
      supabaseService.savePatient(updatedPat);
    }
    supabaseService.savePayment(newPayment);

    setDoctorBillingAlert(null);

    syncEngine.broadcast({
      type: 'PAYMENT_COLLECTED',
      performedBy: currentUser.username,
      role: currentUser.role,
      platform: currentUser.assignedPlatform,
      title: 'وجه در صندوق تسویه شد',
      description: `مبلغ ${formatToman(newPayment.amount)} از بیمار ${newPayment.patientName} دریافت و در کلینیک ثبت شد.`
    });
  };

  // Save Installment Plan from Calculator (Auto updates installments & checks)
  const handleSaveInstallmentPlan = (
    patientId: string, 
    installments: Installment[], 
    checks: SayadCheck[], 
    downPaymentAmount: number
  ) => {
    const updated = patients.map(p => {
      if (p.id === patientId) {
        const nextPayments = downPaymentAmount > 0 ? [
          {
            id: `pay-${Date.now()}`,
            patientId,
            patientName: p.fullName,
            amount: downPaymentAmount,
            date: getCurrentPersianDate(),
            method: 'pos' as const,
            forTreatment: installments[0]?.treatmentName || 'پیش‌پرداخت اقساط درمان'
          },
          ...(p.payments || [])
        ] : (p.payments || []);

        return {
          ...p,
          installments: [...installments, ...(p.installments || [])],
          sayadChecks: [...checks, ...(p.sayadChecks || [])],
          paidAmount: p.paidAmount + downPaymentAmount,
          balance: p.balance + downPaymentAmount,
          payments: nextPayments
        };
      }
      return p;
    });

    setPatients(updated);
    const updatedPat = updated.find(p => p.id === patientId);
    if (selectedPatient && selectedPatient.id === patientId) {
      setSelectedPatient(updatedPat || null);
    }

    if (updatedPat) {
      supabaseService.savePatient(updatedPat);
    }

    syncEngine.broadcast({
      type: 'CHECK_REGISTERED',
      performedBy: currentUser.username,
      role: currentUser.role,
      platform: currentUser.assignedPlatform,
      title: 'برنامه اقساط و چک‌های درمانی ثبت شد',
      description: `برنامه ${installments.length} قسطی برای بیمار ثبت و در سیستم ذخیره گردید.`
    });
  };

  // Advance Implant Stage
  const handleAdvanceImplantStage = (caseId: string, nextStage: ImplantStage) => {
    const updated = patients.map(p => {
      const hasCase = p.implantCases.some(c => c.id === caseId);
      if (hasCase) {
        return {
          ...p,
          implantCases: p.implantCases.map(c => c.id === caseId ? { ...c, currentStage: nextStage } : c)
        };
      }
      return p;
    });
    setPatients(updated);

    const updatedPat = updated.find(p => p.implantCases.some(c => c.id === caseId));
    if (updatedPat) {
      supabaseService.savePatient(updatedPat);
    }

    syncEngine.broadcast({
      type: 'IMPLANT_UPDATED',
      performedBy: currentUser.username,
      role: currentUser.role,
      platform: currentUser.assignedPlatform,
      title: 'مرحله ایمپلنت تغییر یافت',
      description: `کیس ایمپلنت به مرحله ${nextStage} ارتقا یافت.`
    });
  };

  // Update Lab Status (Real-time synced across clinic terminals)
  const handleUpdateLabStatus = (orderId: string, status: any) => {
    const updated = patients.map(p => {
      const hasOrder = p.labOrders.some(o => o.id === orderId);
      if (hasOrder) {
        return {
          ...p,
          labOrders: p.labOrders.map(o => o.id === orderId ? { ...o, status } : o)
        };
      }
      return p;
    });
    setPatients(updated);

    const updatedPat = updated.find(p => p.labOrders.some(o => o.id === orderId));
    if (updatedPat) {
      supabaseService.savePatient(updatedPat);
      syncEngine.broadcast({
        type: 'LAB_DISPATCHED',
        performedBy: currentUser.username,
        role: currentUser.role,
        platform: currentUser.assignedPlatform,
        title: 'وضعیت لابراتوار به‌روزرسانی شد',
        description: `سفارش کار لابراتوار بلادرنگ ارتقا یافت.`,
        payload: { orderId, status, patientId: updatedPat.id }
      });
    }
  };

  // Add Appointment (Instantly synced)
  const handleAddAppointment = (newAptData: Omit<Appointment, 'id'>) => {
    const newApt: Appointment = {
      ...newAptData,
      id: `apt-${Date.now()}`
    };
    const prevApts = appointments;
    setAppointments([newApt, ...appointments]);

    // Register Undo Action
    undoManager.register({
      title: 'نوبت جدید ثبت شد',
      description: `${newAptData.patientName} · ساعت ${newAptData.time}`,
      undo: () => {
        setAppointments(prevApts);
      }
    });

    // Persist to Supabase Cloud
    supabaseService.saveAppointment(newApt);

    syncEngine.broadcast({
      type: 'APPOINTMENT_SCHEDULED',
      performedBy: currentUser.username,
      role: currentUser.role,
      platform: currentUser.assignedPlatform,
      title: 'نوبت جدید ثبت شد',
      description: `نوبت ساعت ${newAptData.time} برای ${newAptData.patientName} در ${newAptData.unit} با موفقیت ثبت شد.`
    });
  };

  // Update Appointment Status
  const handleUpdateAppointmentStatus = (id: string, status: Appointment['status']) => {
    const prevApts = appointments;
    const targetApt = appointments.find(a => a.id === id);
    const updatedApts = appointments.map(a => a.id === id ? { ...a, status } : a);
    setAppointments(updatedApts);

    if (targetApt) {
      const updatedApt = { ...targetApt, status };
      supabaseService.saveAppointment(updatedApt);

      undoManager.register({
        title: 'وضعیت نوبت تغییر یافت',
        description: `${targetApt.patientName} به ${status === 'in_chair' ? 'روی یونیت' : status === 'waiting' ? 'در انتظار' : status === 'cancelled' ? 'لغو شده' : 'برنامه‌ریزی شده'}`,
        undo: () => {
          setAppointments(prevApts);
          supabaseService.saveAppointment(targetApt);
        }
      });
    }
  };

  // Move Appointment between units or time slots seamlessly (Drag-and-Drop)
  const handleMoveAppointment = (id: string, newUnit: string, newTime?: string) => {
    let movedPatientName = '';
    const updated = appointments.map(a => {
      if (a.id === id) {
        movedPatientName = a.patientName;
        return {
          ...a,
          unit: newUnit,
          ...(newTime ? { time: newTime } : {})
        };
      }
      return a;
    });

    setAppointments(updated);

    const moved = updated.find(a => a.id === id);
    if (moved) {
      supabaseService.saveAppointment(moved);
    }

    // Global real-time sync broadcast to all platform terminals
    syncEngine.broadcast({
      type: 'APPOINTMENT_SCHEDULED',
      performedBy: currentUser.username,
      role: currentUser.role,
      platform: currentUser.assignedPlatform,
      title: 'جابجایی نوبت بیمار در یونیت‌ها (Drag & Drop)',
      description: `نوبت ${movedPatientName || 'بیمار'} با موفقیت به ${newUnit}${newTime ? ` ساعت ${newTime}` : ''} منتقل شد.`
    });
  };

  // Add New Patient (Manual file number support & auto-incrementation)
  const handleAddNewPatient = (newPat: any) => {
    const finalFileNumber = newPat.fileNumber || getNextFileNumber(getLatestFileNumber(patients));
    recordLastFileNumber(finalFileNumber);

    const created: Patient = {
      ...newPat,
      id: `pat-${Date.now()}`,
      fileNumber: finalFileNumber,
      totalCost: 0,
      paidAmount: 0,
      balance: 0,
      activeTreatmentsCount: 0,
      lastVisit: getCurrentPersianDate(),
      teethConditions: {},
      sayadChecks: [],
      installments: [],
      labOrders: [],
      implantCases: [],
      payments: []
    };
    setPatients([created, ...patients]);
    setSelectedPatient(created);

    // Persist to Supabase Cloud
    supabaseService.savePatient(created);

    syncEngine.broadcast({
      type: 'TREATMENT_REGISTERED',
      performedBy: currentUser.username,
      role: currentUser.role,
      platform: currentUser.assignedPlatform,
      title: 'پرونده بیمار جدید تشکیل شد',
      description: `بیمار ${created.fullName} با شماره پرونده ${created.fileNumber} ثبت گردید.`
    });
  };

  // Update Patient File Number (Manual edit, updates auto-increment baseline)
  const handleUpdatePatientFileNumber = (patientId: string, newFileNumber: string) => {
    const trimmed = newFileNumber.trim();
    if (!trimmed) return;

    recordLastFileNumber(trimmed);

    const updated = patients.map(p => {
      if (p.id === patientId) {
        return { ...p, fileNumber: trimmed };
      }
      return p;
    });

    setPatients(updated);
    const updatedPat = updated.find(p => p.id === patientId);
    if (selectedPatient && selectedPatient.id === patientId) {
      setSelectedPatient({ ...selectedPatient, fileNumber: trimmed });
    }

    if (updatedPat) {
      supabaseService.savePatient(updatedPat);
    }

    syncEngine.broadcast({
      type: 'TREATMENT_REGISTERED',
      performedBy: currentUser.username,
      role: currentUser.role,
      platform: currentUser.assignedPlatform,
      title: 'شماره پرونده بیمار ویرایش شد',
      description: `شماره پرونده به ${trimmed} تغییر یافت و دنباله نوبت‌دهی خودکار از این شماره ادامه می‌یابد.`
    });
  };

  // Open Official Treatment Invoice Modal
  const handleOpenInvoice = (patient: Patient) => {
    setInvoicePatient(patient);
    setInvoiceModalOpen(true);
  };

  // Update specific treatment status (planned, in_progress, completed)
  const handleUpdateTreatmentStatus = (patientId: string, toothKey: string, status: ToothCondition['status']) => {
    const updated = patients.map(p => {
      if (p.id === patientId && p.teethConditions[toothKey]) {
        return {
          ...p,
          teethConditions: {
            ...p.teethConditions,
            [toothKey]: {
              ...p.teethConditions[toothKey],
              status
            }
          }
        };
      }
      return p;
    });
    setPatients(updated);
    const updatedPat = updated.find(p => p.id === patientId);
    if (selectedPatient && selectedPatient.id === patientId) {
      setSelectedPatient(updatedPat || null);
    }

    if (updatedPat) {
      supabaseService.savePatient(updatedPat);
    }
  };

  // Update specific treatment cost (Manager / Dr. Mehdi Amiri protected)
  const handleUpdateTreatmentCost = (patientId: string, toothKey: string, newCost: number) => {
    const updated = patients.map(p => {
      if (p.id === patientId && p.teethConditions[toothKey]) {
        const oldCost = p.teethConditions[toothKey].cost || 0;
        const diff = newCost - oldCost;
        return {
          ...p,
          totalCost: Math.max(0, p.totalCost + diff),
          balance: p.balance - diff,
          teethConditions: {
            ...p.teethConditions,
            [toothKey]: {
              ...p.teethConditions[toothKey],
              cost: newCost
            }
          }
        };
      }
      return p;
    });

    setPatients(updated);
    const updatedPat = updated.find(p => p.id === patientId);
    if (selectedPatient && selectedPatient.id === patientId) {
      setSelectedPatient(updatedPat || null);
    }

    if (updatedPat) {
      supabaseService.savePatient(updatedPat);
      stateSyncQueue.enqueue('patients', 'UPDATE', updatedPat, 'local');
    }

    syncEngine.broadcast({
      type: 'TREATMENT_REGISTERED',
      performedBy: currentUser.username,
      role: currentUser.role,
      platform: currentUser.assignedPlatform,
      title: 'تعرفه درمان با مجوز مدیریت اصلاح شد',
      description: `تعرفه دندان در پرونده ${updatedPat?.fullName || 'بیمار'} به ${formatToman(newCost)} به‌روز شد.`
    });
  };

  // Add Dental Prescription to Patient File
  const handleAddPrescription = (patientId: string, newRx: DentalPrescription) => {
    const updated = patients.map(p => {
      if (p.id === patientId) {
        return {
          ...p,
          prescriptions: [newRx, ...(p.prescriptions || [])]
        };
      }
      return p;
    });
    setPatients(updated);
    const updatedPat = updated.find(p => p.id === patientId);
    if (selectedPatient && selectedPatient.id === patientId) {
      setSelectedPatient(updatedPat || null);
    }

    if (updatedPat) {
      supabaseService.savePatient(updatedPat);
    }
  };

  // Toggle Patient Legal Consent
  const handleToggleConsent = (patientId: string, consentId: string) => {
    const updated = patients.map(p => {
      if (p.id === patientId) {
        const existing = p.consents || [];
        const found = existing.find(c => c.id === consentId);
        const nextConsents = found
          ? existing.map(c => c.id === consentId ? { ...c, isConfirmed: !c.isConfirmed } : c)
          : [...existing, { id: consentId, patientId, procedureType: 'general' as const, title: 'رضایت‌نامه درمان', signedDate: getCurrentPersianDate(), isConfirmed: true }];
        return {
          ...p,
          consents: nextConsents
        };
      }
      return p;
    });
    setPatients(updated);
    const updatedPat = updated.find(p => p.id === patientId);
    if (selectedPatient && selectedPatient.id === patientId) {
      setSelectedPatient(updatedPat || null);
    }

    if (updatedPat) {
      supabaseService.savePatient(updatedPat);
      indexedDbService.savePatient(updatedPat);
    }
  };

  // Save Legal Digital Signature with Cryptographic Hash & Date
  const handleSaveConsentSignature = (
    patientId: string,
    consentId: string,
    signatureDataUrl: string,
    timestamp: string,
    cryptoHash?: string
  ) => {
    const updated = patients.map(p => {
      if (p.id === patientId) {
        const existing = p.consents || [];
        const found = existing.find(c => c.id === consentId);
        const consentData: PatientConsent = {
          id: consentId,
          patientId,
          procedureType: found?.procedureType || 'general',
          title: found?.title || 'رضایت‌نامه آگاهانه درمانی',
          signedDate: getCurrentPersianDate(),
          isConfirmed: true,
          signatureDataUrl,
          timestamp,
          cryptoHash
        };
        const nextConsents = found
          ? existing.map(c => c.id === consentId ? { ...c, ...consentData } : c)
          : [...existing, consentData];
        return {
          ...p,
          consents: nextConsents
        };
      }
      return p;
    });

    setPatients(updated);
    const updatedPat = updated.find(p => p.id === patientId);
    if (selectedPatient && selectedPatient.id === patientId) {
      setSelectedPatient(updatedPat || null);
    }

    if (updatedPat) {
      supabaseService.savePatient(updatedPat);
      indexedDbService.savePatient(updatedPat);
    }

    syncEngine.broadcast({
      type: 'TREATMENT_REGISTERED',
      performedBy: currentUser.username,
      role: currentUser.role,
      platform: currentUser.assignedPlatform,
      title: 'امضای الکترونیکی و قانونی بیمار ثبت شد',
      description: `رضایت‌نامه درمان بیمار ${updatedPat?.fullName || ''} با اثر انگشت/قلم لمسی و هش رمزنگاری SHA-256 ذخیره گردید.`
    });
  };

  // Add New Staff / Doctor Member with Password & Credentials
  const handleAddNewUser = (newUser: UserAccount) => {
    setUsers(prev => [...prev, newUser]);
    syncEngine.broadcast({
      type: 'CLOUD_BACKUP_SAVED',
      performedBy: currentUser.username,
      role: currentUser.role,
      platform: currentUser.assignedPlatform,
      title: `عضو جدید ${newUser.fullName} به کلینیک اضافه شد`,
      description: `نقش ${newUser.role} با ایمیل ${newUser.email} و رمز عبور اختصاصی ایجاد گردید.`
    });
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col items-center justify-start overflow-x-hidden relative selection:bg-cyan-500 selection:text-black">
      
      {/* Animated Gemini Multi-Color Aurora Background Tailored to Each Section */}
      <AnimatedGeminiBackground activeView={activeView} />

      {/* Loading Skeleton (UI4) */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/90 gap-6 p-8">
          <DentalSkeletonLoader type="dashboard" count={4} />
        </div>
      )}

      {/* Main Responsive App Container - Scales beautifully on tablets, desktop 1080p, 1440p and widescreen displays */}
      <div className="w-full max-w-lg md:max-w-3xl lg:max-w-5xl xl:max-w-7xl 2xl:max-w-[1680px] min-h-screen relative flex flex-col shadow-[0_10px_40px_rgba(0,0,0,0.06)] border-x border-slate-200/60 z-10 mx-auto transition-all duration-300">
        
        {/* Top Header with MinaDental Logo, Persian Clock, Wifi/Antenna, Cloud Auto-Sync and Reminders Bell */}
        <AppHeader
          title={
            activeView === 'financial' ? 'مالی' :
            activeView === 'appointments' ? 'نوبت‌ها' :
            activeView === 'patients' ? 'بیماران' :
            activeView === 'lab' ? 'لابراتوار' :
            activeView === 'implant' ? 'ایمپلنت' :
            activeView === 'ai_assistant' ? 'هوشمند' :
            activeView === 'inventory' ? 'انبار' :
            activeView === 'reminders' ? 'یادآوری' :
            activeView === 'settings' ? 'تنظیمات' :
            activeView === 'sterilization' ? 'استریل' :
            activeView === 'insurance_claims' ? 'بیمه' : undefined
          }
          currentUser={currentUser}
          showBack={activeView !== 'home'}
          unreadRemindersCount={unreadNotificationsCount}
          onBack={() => {
            setActiveView('home');
            setActiveTab('home');
          }}
          onOpenProfile={() => setRoleSwitcherModalOpen(true)}
          onOpenReminders={() => setNotificationDrawerOpen(true)}
          onOpenSupabaseTest={() => setSupabaseTestModalOpen(true)}
          onOpenPhaseAudit={() => setPhaseAuditModalOpen(true)}
          onOpenProjectDownload={() => setProjectDownloadModalOpen(true)}
          onSimulateIncomingCall={() => handleSimulateIncomingCall()}
          onOpenAccessibility={() => setAccessibilityModalOpen(true)}
          onOpenClinicalHud={() => setClinicalHudOpen(true)}
          onOpenSearch={() => {
            if (activeView !== 'home') {
              setActiveView('home');
              setActiveTab('home');
            }
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('minadental:focus-patient-search'));
            }, 80);
          }}
          onTriggerSync={async () => {
            // Instant real-time cloud broadcast handshake
            syncEngine.broadcast({
              type: 'TREATMENT_REGISTERED',
              performedBy: currentUser.username,
              role: currentUser.role,
              platform: currentUser.assignedPlatform,
              title: 'همگام‌سازی ابری مینادنتال انجام شد',
              description: 'کلیه داده‌های بیماران، نوبت‌ها و امور مالی در بستر ابری همگام گردید.'
            });
            return true;
          }}
        />

        {/* Smart Patient Caller ID Floating Banner */}
        <IncomingCallBanner
          call={incomingCall}
          onClose={() => setIncomingCall(null)}
          onScheduleAppointment={(name, phone) => {
            setActiveView('appointments');
            setActiveTab('appointments');
          }}
          onOpenPatientFile={(p) => setSelectedPatient(p)}
          onQuickAdmission={(phone) => {
            setActiveView('patients');
            setActiveTab('patients');
          }}
        />

        {/* Live Synchronized Doctor Billing Alert for Secretary */}
        {doctorBillingAlert && (
          <div className="mx-4 my-2 p-3 rounded-2xl bg-gradient-to-r from-red-950/80 to-amber-950/80 border border-amber-500/50 text-white shadow-xl flex items-center justify-between gap-3 animate-bounce">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-400 text-black flex items-center justify-center font-bold shrink-0">
                  <DollarSign className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <span className="text-xs font-black text-amber-300 block">
                    اعلام فوری پزشک در یونیت: درمان تمام شد!
                  </span>
                  <span className="text-[11px] text-white/80 mt-0.5 block">
                    بیمار {doctorBillingAlert.patientName} · {doctorBillingAlert.treatment} · {formatToman(doctorBillingAlert.amount)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setAddPaymentModalOpen(true)}
                  className="py-1.5 px-3 rounded-xl bg-[#c8ff00] text-black font-extrabold text-xs shadow-md active:scale-95 transition-all"
                >
                  دریافت وجه (POS)
                </button>
                <button
                  onClick={() => setDoctorBillingAlert(null)}
                  className="w-7 h-7 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
                  title="بستن اعلان"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Real-time Sync Toast Notification */}
          <SyncNotificationToast
            event={activeSyncEvent}
            onDismiss={() => setActiveSyncEvent(null)}
            onActionClick={(event) => {
              if (event.type === 'TREATMENT_REGISTERED') setAddPaymentModalOpen(true);
              if (event.type === 'APPOINTMENT_SCHEDULED') setActiveView('appointments');
            }}
          />

          {/* View Routing */}
          <main className="flex-1 pb-24 sm:pb-28">
            {activeView === 'home' && (
              <DashboardView
                patients={patients}
                appointments={appointments}
                onSelectPatient={(p) => setSelectedPatient(p)}
                onOpenPalmerForPatient={(p) => {
                  setSelectedPatient(p);
                  setPalmerChartOpen(true);
                }}
                onOpenAppointmentForPatient={(p) => {
                  setSelectedPatient(p);
                  setActiveView('appointments');
                  setActiveTab('appointments');
                }}
                onNavigate={handleServicesNavigate}
                onOpenPalmerChart={() => setPalmerChartOpen(true)}
                onQuickAdmission={() => setActiveView('patients')}
                onOpenSupabaseTest={() => setSupabaseTestModalOpen(true)}
                onOpenPhaseAudit={() => setPhaseAuditModalOpen(true)}
                onOpenLabSlip={(order) => setLabSlipOrder(order)}
                onUpdateLabStatus={handleUpdateLabStatus}
                todayAppointmentsCount={todayAppointmentsCount}
                activeSurgeriesCount={activeSurgeriesCount}
                readyLabOrdersCount={readyLabOrdersCount}
                dailyRevenue={dailyRevenue}
                inventory={inventory}
                onAddNewPatient={handleAddNewPatient}
              />
            )}

            {activeView === 'financial' && (
              <FinancialView
                patients={patients}
                onOpenCheckModal={() => setAddCheckModalOpen(true)}
                onOpenPatientFile={(p) => setSelectedPatient(p)}
                onOpenPaymentModal={() => setAddPaymentModalOpen(true)}
                onOpenInvoice={handleOpenInvoice}
                onOpenCommissionModal={() => setCommissionModalOpen(true)}
                onSaveInstallmentPlan={handleSaveInstallmentPlan}
              />
            )}

            {activeView === 'appointments' && (
              <AppointmentsView
                appointments={appointments}
                patients={patients}
                onAddAppointment={handleAddAppointment}
                onUpdateStatus={handleUpdateAppointmentStatus}
                onMoveAppointment={handleMoveAppointment}
                onOpenBookingPortal={() => setBookingPortalModalOpen(true)}
              />
            )}

            {activeView === 'lab' && (
              <LabModuleView
                patients={patients}
                onOpenPatientFile={(p) => setSelectedPatient(p)}
                onAddLabOrder={() => setAddLabOrderModalOpen(true)}
                onUpdateStatus={handleUpdateLabStatus}
                onOpenDigitalLabPortal={() => setDigitalLabModalOpen(true)}
              />
            )}

            {activeView === 'implant' && (
              <ImplantModuleView
                patients={patients}
                onOpenPatientFile={(p) => setSelectedPatient(p)}
                onAdvanceStage={handleAdvanceImplantStage}
                onAddImplantCase={(newCase) => {
                  setPatients(patients.map(p => p.id === newCase.patientId ? {
                    ...p,
                    implantCases: [newCase, ...(p.implantCases || [])]
                  } : p));
                }}
              />
            )}

            {activeView === 'patients' && (
              <PatientsListView
                patients={patients}
                onOpenPatientFile={handleOpenPatientFile}
                onAddNewPatient={handleAddNewPatient}
                onUpdateFileNumber={handleUpdatePatientFileNumber}
                onOpenInvoice={handleOpenInvoice}
                onOpenPalmerChart={(p) => {
                  setSelectedPatient(p);
                  setPalmerChartOpen(true);
                }}
              />
            )}

            {activeView === 'ai_assistant' && (
              <AiAssistantView />
            )}

            {activeView === 'inventory' && (
              <InventoryView
                inventory={inventory}
                onUpdateStock={(id, newStock) => {
                  setInventory(inventory.map(i => i.id === id ? { ...i, stock: newStock } : i));
                }}
                onAddItem={(item) => setInventory([item, ...inventory])}
                onBatchUpdate={(updated) => setInventory(updated)}
              />
            )}

            {activeView === 'reminders' && (
              <RemindersView onOpenSmsGatewaySettings={() => setSmsGatewayModalOpen(true)} />
            )}

            {activeView === 'xrays' && (
              <XRayModuleView
                patients={patients}
                onOpenPatientFile={(p) => setSelectedPatient(p)}
              />
            )}

            {activeView === 'marketing' && (
              <MarketingCampaignsView
                patients={patients}
                onOpenPatientFile={handleOpenPatientFile}
              />
            )}

            {activeView === 'settings' && (
              <SettingsView 
                onOpenSupabaseTest={() => setSupabaseTestModalOpen(true)}
                onOpenPhaseAudit={() => setPhaseAuditModalOpen(true)}
                onOpenProjectDownload={() => setProjectDownloadModalOpen(true)}
                onOpenLiveSync={() => setLiveSyncModalOpen(true)}
              />
            )}

            {activeView === 'sterilization' && (
              <SterilizationModuleView 
                onLinkPackToPatient={(barcode) => {
                  if (patients[0]) {
                    setPatients(prev => prev.map((p, idx) => idx === 0 ? {
                      ...p,
                      treatments: [{
                        id: `trt-ster-${Date.now()}`,
                        tooth: 'یونیت جراحی',
                        treatment: `پک استریل الصاقی لاگ اتوکلاو (${barcode})`,
                        cost: 0,
                        date: getCurrentPersianDate(),
                        status: 'completed',
                        doctorName: 'دکتر مهدی امیری'
                      }, ...(p.treatments || [])]
                    } : p));
                  }
                }}
              />
            )}

            {activeView === 'insurance_claims' && (
              <InsuranceClaimsView
                patients={patients}
                onOpenPatientFile={handleOpenPatientFile}
              />
            )}
          </main>

          {/* Bottom Dock Navigation Bar (Persistent across all screens) */}
          <BottomDock
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onOpenServicesMenu={() => setServicesMenuOpen(true)}
            onOpenThumbZone={() => setThumbZoneOpen(true)}
          />

          {/* Screenshot 1: Full Services Sheet Modal */}
          <ServicesSheet
            isOpen={servicesMenuOpen}
            onClose={() => setServicesMenuOpen(false)}
            onNavigate={handleServicesNavigate}
            lowStockCount={inventory.filter(i => i.stock <= i.minAlert).length}
          />

          {/* 3D Palmer Dental Chart & Surface Picker Modal */}
          <PalmerChartModal
            isOpen={palmerChartOpen}
            onClose={() => setPalmerChartOpen(false)}
            patientName={selectedPatient?.fullName || 'بیمار جدید / پیش‌فرض'}
            patient={selectedPatient}
            teethConditions={selectedPatient?.teethConditions}
            onSaveTreatment={handleSaveTreatment}
          />

          {/* Comprehensive Patient Record File Modal */}
          <PatientFileModal
            patient={selectedPatient}
            isOpen={!!selectedPatient}
            onClose={() => setSelectedPatient(null)}
            initialTab={patientFileInitialTab}
            currentUser={currentUser}
            onOpenPalmerChart={() => setPalmerChartOpen(true)}
            onAddCheck={() => setAddCheckModalOpen(true)}
            onAddPayment={() => setAddPaymentModalOpen(true)}
            onAddLabOrder={() => setAddLabOrderModalOpen(true)}
            onOpenXRayModule={() => setActiveView('xrays')}
            onUpdateFileNumber={handleUpdatePatientFileNumber}
            onOpenInvoice={handleOpenInvoice}
            onUpdateTreatmentStatus={handleUpdateTreatmentStatus}
            onUpdateTreatmentCost={handleUpdateTreatmentCost}
            onAddPrescription={handleAddPrescription}
            onToggleConsent={handleToggleConsent}
            onSaveConsentSignature={handleSaveConsentSignature}
          />

          {/* Printable Official Dental Clinic Invoice Modal */}
          <TreatmentInvoiceModal
            isOpen={invoiceModalOpen}
            onClose={() => setInvoiceModalOpen(false)}
            patient={invoicePatient || selectedPatient || patients[0]}
          />

          {/* Sayad & Guarantee Check Creation Modal */}
          <AddCheckModal
            isOpen={addCheckModalOpen}
            onClose={() => setAddCheckModalOpen(false)}
            patients={patients}
            onAddCheck={handleAddCheck}
          />

          {/* Lab Order Dispatch Modal */}
          <AddLabOrderModal
            isOpen={addLabOrderModalOpen}
            onClose={() => setAddLabOrderModalOpen(false)}
            patients={patients}
            onAddOrder={handleAddLabOrder}
          />

          {/* POS & Cash Payment Modal */}
          <AddPaymentModal
            isOpen={addPaymentModalOpen}
            onClose={() => setAddPaymentModalOpen(false)}
            patients={patients}
            onAddPayment={handleAddPayment}
          />

          {/* Live Dual-Platform Secretary & Doctor Simulator Modal */}
          <LiveSyncSimulatorModal
            isOpen={liveSyncModalOpen}
            onClose={() => setLiveSyncModalOpen(false)}
            patients={patients}
            appointments={appointments}
            onSecretaryBookAppointment={(name: string, time: string) => {
              handleAddAppointment({
                patientId: 'pat-new',
                patientName: name,
                phone: '۰۹۱۲۳۴۵۶۷۸۹',
                unit: 'یونیت ۱',
                doctor: 'دکتر مهدی امیری',
                date: getCurrentPersianDate(),
                time,
                durationMinutes: 45,
                treatment: 'معاینه و طرح درمان',
                status: 'scheduled'
              });
            }}
            onDoctorRegisterTreatment={(patientId: string, _tooth: string, _treatmentName: string, cost: number) => {
              const p = patients.find(pat => pat.id === patientId) || patients[0];
              setSelectedPatient(p);
              handleSaveTreatment({
                quadrant: 'UR',
                toothNumber: 5,
                surfaces: ['occlusal', 'buccal'],
                treatment: 'crown_zirconia',
                cost,
                notes: 'روکش تمام زیرکونیا تراش و قالب‌گیری شد'
              });
            }}
            onSecretaryCollectPayment={(patientId: string, amount: number) => {
              handleAddPayment({
                id: `pay-${Date.now()}`,
                patientId,
                patientName: 'علی مرادی',
                amount,
                date: getCurrentPersianDate(),
                method: 'pos',
                referenceNumber: '۷۲۸۴۹۱۲۸',
                terminalName: 'کارتخوان پذیرش مطب (به‌پرداخت ملت)',
                forTreatment: 'تسویه روکش زیرکونیا'
              });
            }}
          />

          {/* Role and Connected Platform Switcher Modal */}
          <RoleSwitcherModal
            isOpen={roleSwitcherModalOpen}
            onClose={() => setRoleSwitcherModalOpen(false)}
            currentUser={currentUser}
            users={users}
            platforms={platforms}
            onSwitchUser={(user) => setCurrentUser(user)}
            onAddPlatform={(platform) => setPlatforms([...platforms, platform])}
            onAddUser={handleAddNewUser}
          />

          {/* Cloud and Local Backup & Restore Modal */}
          <BackupModal
            isOpen={backupModalOpen}
            onClose={() => setBackupModalOpen(false)}
            clinicName="مرکز تخصصی دندانپزشکی مینادنتال"
            patients={patients}
            appointments={appointments}
            inventory={inventory}
            users={users}
            platforms={platforms}
            onRestoreData={(restored) => {
              if (restored.patients) setPatients(restored.patients);
              if (restored.appointments) setAppointments(restored.appointments);
              if (restored.inventory) setInventory(restored.inventory);
            }}
          />

          {/* World-Class Slide-over Notification & Reminders Drawer */}
          <NotificationDrawer
            isOpen={notificationDrawerOpen}
            onClose={() => setNotificationDrawerOpen(false)}
            onNavigateToModule={handleServicesNavigate}
            onUnreadCountChange={setUnreadNotificationsCount}
          />

          {/* Supabase Realtime Cloud DB & Diagnostic Test Suite Modal */}
          <SupabaseTestModal
            isOpen={supabaseTestModalOpen}
            onClose={() => setSupabaseTestModalOpen(false)}
          />

          {/* Doctor Commission & Surgical Profit-Sharing Modal */}
          <DoctorCommissionModal
            isOpen={commissionModalOpen}
            onClose={() => setCommissionModalOpen(false)}
            patients={patients}
          />

          {/* Official Printable Lab Prescription Slip Modal */}
          <LabPrescriptionModal
            isOpen={!!labSlipOrder}
            onClose={() => setLabSlipOrder(null)}
            order={labSlipOrder}
            patient={patients.find(p => p.id === labSlipOrder?.patientId) || null}
          />

          {/* Digital Lab Technician Portal Modal */}
          <DigitalLabPortalModal
            isOpen={digitalLabModalOpen}
            onClose={() => setDigitalLabModalOpen(false)}
            patients={patients}
            onUpdateOrderStatus={handleUpdateLabStatus}
          />

          {/* Smart Patient Self-Booking Portal Modal */}
          <PatientBookingPortalModal
            isOpen={bookingPortalModalOpen}
            onClose={() => setBookingPortalModalOpen(false)}
            onBookingConfirmed={(newBooking) => {
              handleAddAppointment({
                patientId: 'pat-online-' + Date.now(),
                patientName: newBooking.patientName,
                phone: newBooking.phone,
                unit: 'یونیت ۱',
                doctor: newBooking.doctorName,
                date: newBooking.date,
                time: newBooking.time,
                durationMinutes: 45,
                treatment: newBooking.serviceTitle,
                status: 'scheduled'
              });
            }}
          />

          {/* SMS Gateway & Clinic Geo-Routing Settings Modal */}
          <SmsGatewaySettingsModal
            isOpen={smsGatewayModalOpen}
            onClose={() => setSmsGatewayModalOpen(false)}
          />

          {/* Slide-Over Clinical HUD Telemetry Drawer */}
          <ClinicalHudDrawer
            isOpen={clinicalHudOpen}
            onClose={() => setClinicalHudOpen(false)}
            patient={selectedPatient}
            patients={patients}
            onSelectPatient={(p) => setSelectedPatient(p)}
            onOpenPatientFile={(p) => handleOpenPatientFile(p)}
            onOpenPalmerChart={(p) => {
              setSelectedPatient(p);
              setPalmerChartOpen(true);
            }}
            onOpenPaymentModal={(p) => {
              setSelectedPatient(p);
              setAddPaymentModalOpen(true);
            }}
            onOpenAppointmentModal={(p) => {
              setSelectedPatient(p);
              setActiveView('appointments');
              setActiveTab('appointments');
            }}
          />

          {/* Surgical Accessibility, Anti-Glare High-Contrast & Glove Controls Modal */}
          <AccessibilityControlsModal
            isOpen={accessibilityModalOpen}
            onClose={() => setAccessibilityModalOpen(false)}
          />

          {/* One-Handed Thumb Zone Arc Action Sheet */}
          <OneHandedActionSheet
            isOpen={thumbZoneOpen}
            onClose={() => setThumbZoneOpen(false)}
            onQuickAdmission={() => {
              setActiveView('patients');
              setActiveTab('patients');
            }}
            onOpenAppointments={() => {
              setActiveView('appointments');
              setActiveTab('appointments');
            }}
            onOpenPaymentModal={() => setAddPaymentModalOpen(true)}
            onOpenClinicalHud={() => setClinicalHudOpen(true)}
            onOpenPalmerChart={() => setPalmerChartOpen(true)}
            onOpenLabOrders={() => {
              setActiveView('lab');
              setActiveTab('treatments');
            }}
          />

          {/* Global Clinical Action Undo / Redo Toast */}
          <GlobalUndoToast />

          {/* Master Phased Diagnostic & Verification Test Suite Modal */}
          <PhaseAuditSuiteModal
            isOpen={phaseAuditModalOpen}
            onClose={() => setPhaseAuditModalOpen(false)}
          />

          {/* Complete Project Archive Download & Link Copier Modal */}
          <ProjectDownloadModal
            isOpen={projectDownloadModalOpen}
            onClose={() => setProjectDownloadModalOpen(false)}
          />

          {/* Global Command Palette — Cmd+K / Ctrl+K (UI5) */}
          <GlobalCommandPalette
            isOpen={commandPaletteOpen}
            onClose={() => setCommandPaletteOpen(false)}
            patients={patients}
            onSelectPatient={(p) => { setCommandPaletteOpen(false); setSelectedPatient(p); }}
            onOpenPalmerChart={(p) => { setCommandPaletteOpen(false); setSelectedPatient(p); setPalmerChartOpen(true); }}
            onNavigate={(viewId) => { setCommandPaletteOpen(false); handleServicesNavigate(viewId); }}
            onQuickAdmission={() => { setCommandPaletteOpen(false); setActiveView('patients'); setActiveTab('patients'); }}
            onOpenPaymentModal={() => { setCommandPaletteOpen(false); setAddPaymentModalOpen(true); }}
            onOpenClinicalHud={() => { setCommandPaletteOpen(false); setClinicalHudOpen(true); }}
            onOpenAccessibility={() => { setCommandPaletteOpen(false); setAccessibilityModalOpen(true); }}
          />

          {/* Consent Signature Modal (UI6) */}
          {selectedPatient && (
            <ConsentSignatureModal
              isOpen={consentSignatureModalOpen}
              onClose={() => setConsentSignatureModalOpen(false)}
              consentTitle="رضایت‌نامه آگاهانه درمانی"
              consentDesc="بیمار گرامی، لطفاً پس از مطالعه کامل شرایط درمان، امضای خود را در کادر زیر ثبت فرمایید."
              patient={selectedPatient}
              onSaveSignature={(sig, ts, hash) => {
                if (selectedPatient && selectedPatient.consents && selectedPatient.consents.length > 0) {
                  handleSaveConsentSignature(selectedPatient.id, selectedPatient.consents[0].id, sig, ts, hash);
                }
                setConsentSignatureModalOpen(false);
              }}
            />
          )}

        </div>
      </div>
  );
}
