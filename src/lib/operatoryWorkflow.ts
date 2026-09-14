// operatoryWorkflow.ts — ADA Operatory Workflow, Waiting Time & Smart Patient Call Paging
import { toPersianDigits } from './persianDate'
import { chimes } from './chimes'

export interface OperatoryAnnouncementOptions {
  patientName: string
  unitName?: string | null
  doctorName?: string | null
  turnNumber?: number | string | null
  fileNumber?: number | string | null
}

/**
 * Calculates waiting time in minutes between patient check-in and either
 * their chair entry time or the current moment.
 */
export function computeWaitingTimeMinutes(
  checkInTime: string | null | undefined,
  chairEntryOrNowTime?: string | null | undefined,
): number {
  if (!checkInTime) return 0

  const parseToMs = (val: string): number => {
    // If it's a full ISO string
    if (val.includes('T') || val.includes('-')) {
      const parsed = Date.parse(val)
      return isNaN(parsed) ? 0 : parsed
    }
    // If it's HH:mm format
    const match = /^(\d{1,2}):(\d{2})/.exec(val)
    if (match) {
      const now = new Date()
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number(match[1]), Number(match[2]), 0)
      return d.getTime()
    }
    return 0
  }

  const startMs = parseToMs(checkInTime)
  if (!startMs) return 0

  const endMs = chairEntryOrNowTime ? parseToMs(chairEntryOrNowTime) : Date.now()
  if (!endMs || endMs <= startMs) return 0

  return Math.max(0, Math.floor((endMs - startMs) / (60 * 1000)))
}

/**
 * Formats waiting time in human-friendly Persian words.
 */
export function formatWaitingTime(minutes: number): string {
  if (minutes <= 0) return 'هم‌اکنون پذیرش شد'
  if (minutes < 1) return 'کمتر از ۱ دقیقه'

  if (minutes < 60) {
    return `${toPersianDigits(minutes)} دقیقه در انتظار`
  }

  const hours = Math.floor(minutes / 60)
  const remMinutes = minutes % 60
  if (remMinutes === 0) {
    return `${toPersianDigits(hours)} ساعت در انتظار`
  }
  return `${toPersianDigits(hours)} ساعت و ${toPersianDigits(remMinutes)} دقیقه در انتظار`
}

/**
 * Builds standard clinical clinic paging announcement text.
 */
export function buildPatientCallAnnouncement(options: OperatoryAnnouncementOptions): string {
  const patient = (options.patientName || '').trim() || 'بیمار محترم'
  const unit = (options.unitName || '').trim()
  const doctor = (options.doctorName || '').trim()

  let target = 'اتاق درمان'
  if (unit && doctor) {
    target = `${unit} (دکتر ${doctor})`
  } else if (unit) {
    target = unit
  } else if (doctor) {
    target = `اتاق دکتر ${doctor}`
  }

  const prefix = options.turnNumber
    ? `نوبت شماره ${toPersianDigits(options.turnNumber)}، `
    : options.fileNumber
    ? `پرونده شماره ${toPersianDigits(options.fileNumber)}، `
    : ''

  return `${prefix}بیمار محترم، ${patient}، لطفاً به ${target} مراجعه فرمایید.`
}

/**
 * Plays clinical audio chime and announces the patient's name via Web Speech API.
 */
export async function announcePatientCall(options: OperatoryAnnouncementOptions): Promise<boolean> {
  // Step 1: Play pleasant clinic chime sound
  try {
    chimes.playSuccess()
  } catch {
    // Ignore audio context errors
  }

  // Step 2: Speech Synthesis in Persian if available
  const text = buildPatientCallAnnouncement(options)

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel() // Stop any previous speech
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'fa-IR'
      utterance.rate = 0.9 // Calm, professional clinical speed
      utterance.pitch = 1.0

      // Try finding a Persian voice if installed
      const voices = window.speechSynthesis.getVoices()
      const faVoice = voices.find((v) => v.lang.toLowerCase().startsWith('fa'))
      if (faVoice) {
        utterance.voice = faVoice
      }

      window.speechSynthesis.speak(utterance)
      return true
    } catch {
      return false
    }
  }

  return false
}

/**
 * Masks a patient's full name for privacy on public waiting lounge TV screens (e.g. "علی محمدی" -> "علی م.").
 */
export function maskPatientNameForPublicDisplay(fullName: string): string {
  const clean = (fullName || '').trim()
  if (!clean) return 'بیمار'

  const parts = clean.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0]

  const firstName = parts[0]
  const lastInitial = parts[parts.length - 1].charAt(0)
  return `${firstName} ${lastInitial}.`
}

export type TriageWaitingLevel = 'normal' | 'moderate' | 'critical'

export interface TriageWaitingStatus {
  level: TriageWaitingLevel
  label: string
  badgeClass: string
  color: string
}

/**
 * Returns ADA standard triage category based on elapsed waiting time.
 */
export function getTriageWaitingStatus(minutes: number): TriageWaitingStatus {
  if (minutes > 30) {
    return {
      level: 'critical',
      label: 'معطلی بیش از حد',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 animate-pulse',
      color: '#f43f5e',
    }
  }
  if (minutes >= 15) {
    return {
      level: 'moderate',
      label: 'معطلی متوسط',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
      color: '#f59e0b',
    }
  }
  return {
    level: 'normal',
    label: 'طبیعی',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    color: '#10b981',
  }
}

/**
 * Computes average waiting time in minutes across finished or currently waiting encounters.
 */
export function computeAverageWaitingTime(
  appointments: Array<{ check_in_time?: string | null; chair_entry_time?: string | null }>
): number {
  if (!appointments || appointments.length === 0) return 0

  let totalMinutes = 0
  let count = 0

  for (const a of appointments) {
    if (a.check_in_time) {
      const wait = computeWaitingTimeMinutes(a.check_in_time, a.chair_entry_time)
      if (wait > 0) {
        totalMinutes += wait
        count++
      }
    }
  }

  if (count === 0) return 0
  return Math.round(totalMinutes / count)
}

const WAITING_ROOM_CHANNEL = 'minadent_waiting_room_events'
const WAITING_ROOM_STORAGE_KEY = 'minadent_last_patient_call'

/**
 * Broadcasts a patient call event across browser tabs and smart TV displays.
 */
export function broadcastPatientCall(options: OperatoryAnnouncementOptions): void {
  const payload = {
    type: 'CALL' as const,
    data: options,
    timestamp: Date.now(),
  }

  // BroadcastChannel (modern browsers)
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      const bc = new BroadcastChannel(WAITING_ROOM_CHANNEL)
      bc.postMessage(payload)
      bc.close()
    } catch {
      // Ignore broadcast channel errors
    }
  }

  // LocalStorage event fallback for cross-window synchronization
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(WAITING_ROOM_STORAGE_KEY, JSON.stringify(payload))
    } catch {
      // Ignore storage errors
    }
  }
}

/**
 * Subscribes to waiting room call events from other tabs or workstations.
 */
export function subscribeWaitingRoomEvents(
  callback: (event: { type: 'CALL'; data: OperatoryAnnouncementOptions }) => void
): () => void {
  if (typeof window === 'undefined') return () => {}

  let bc: BroadcastChannel | null = null
  if ('BroadcastChannel' in window) {
    try {
      bc = new BroadcastChannel(WAITING_ROOM_CHANNEL)
      bc.onmessage = (e) => {
        if (e.data && e.data.type === 'CALL') {
          callback(e.data)
        }
      }
    } catch {
      bc = null
    }
  }

  const handleStorage = (e: StorageEvent) => {
    if (e.key === WAITING_ROOM_STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue)
        if (parsed && parsed.type === 'CALL') {
          callback(parsed)
        }
      } catch {
        // Ignore JSON parse errors
      }
    }
  }

  window.addEventListener('storage', handleStorage)

  return () => {
    if (bc) {
      bc.close()
    }
    window.removeEventListener('storage', handleStorage)
  }
}
