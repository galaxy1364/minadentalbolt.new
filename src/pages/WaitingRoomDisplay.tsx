// src/pages/WaitingRoomDisplay.tsx — Public Waiting Room Lounge TV & Patient Call Display Mode
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Volume2,
  Tv,
  Maximize2,
  Minimize2,
  Clock,
  Calendar,
  CheckCircle2,
  User,
  Armchair,
  Stethoscope,
  Sparkles,
  Shield,
  BellRing,
  RefreshCw,
  VolumeX,
} from 'lucide-react'
import { fetchAppointments, fetchDoctors, fetchUnits, fetchPatients } from '../lib/api'
import { AppointmentWithRelations, Doctor, Unit, Patient } from '../types'
import { toJalaliStringPretty, toPersianDigits, formatTime } from '../lib/persianDate'
import {
  computeWaitingTimeMinutes,
  formatWaitingTime,
  getTriageWaitingStatus,
  maskPatientNameForPublicDisplay,
  subscribeWaitingRoomEvents,
  announcePatientCall,
  OperatoryAnnouncementOptions,
} from '../lib/operatoryWorkflow'
import { chimes } from '../lib/chimes'
import { MinadentLogo } from '../components/MinadentLogo'

export default function WaitingRoomDisplay() {
  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)

  // Live time ticker
  const [currentTime, setCurrentTime] = useState(new Date())

  // Public Privacy Masking mode (default: true for waiting room TV)
  const [privacyMode, setPrivacyMode] = useState(false)

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Audio enabled state (browsers block sound until first interaction)
  const [audioEnabled, setAudioEnabled] = useState(true)

  // Active call popup
  const [activeCall, setActiveCall] = useState<{
    patientName: string
    unitName?: string | null
    doctorName?: string | null
    turnNumber?: number | string | null
    fileNumber?: number | string | null
    timestamp: number
  } | null>(null)

  const activeCallTimeoutRef = useRef<any>(null)

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Load today's clinical data
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const loadData = useCallback(async () => {
    try {
      const [allAppts, docs, uns, pats] = await Promise.all([
        fetchAppointments(),
        fetchDoctors(),
        fetchUnits(),
        fetchPatients(),
      ])
      setAppointments(allAppts)
      setDoctors(docs)
      setUnits(uns)
      setPatients(pats)
    } catch (err) {
      console.error('Failed to load waiting room data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    // Poll updates every 15 seconds
    const interval = setInterval(loadData, 15000)
    return () => clearInterval(interval)
  }, [loadData])

  // Subscribe to real-time patient call announcements
  useEffect(() => {
    const unsubscribe = subscribeWaitingRoomEvents((event) => {
      if (event.type === 'CALL') {
        handleTriggerCall(event.data)
      }
    })
    return () => unsubscribe()
  }, [audioEnabled])

  const handleTriggerCall = (callData: OperatoryAnnouncementOptions) => {
    if (activeCallTimeoutRef.current) {
      clearTimeout(activeCallTimeoutRef.current)
    }

    setActiveCall({
      ...callData,
      timestamp: Date.now(),
    })

    if (audioEnabled) {
      announcePatientCall(callData)
    }

    // Auto-dismiss after 14 seconds
    activeCallTimeoutRef.current = setTimeout(() => {
      setActiveCall(null)
    }, 14000)
  }

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  // Waiting patients (status === 'arrived' for today)
  const waitingPatients = useMemo(() => {
    return appointments
      .filter((a) => a.date === todayStr && a.status === 'arrived')
      .sort((a, b) => {
        const timeA = a.check_in_time || a.start_time || ''
        const timeB = b.check_in_time || b.start_time || ''
        return timeA.localeCompare(timeB)
      })
  }, [appointments, todayStr])

  // In-chair patients (status === 'in_chair' for today)
  const inChairPatients = useMemo(() => {
    return appointments.filter((a) => a.date === todayStr && a.status === 'in_chair')
  }, [appointments, todayStr])

  // Active units list
  const activeUnits = useMemo(() => {
    if (units.length > 0) return units.filter((u) => u.is_active)
    // Fallback standard dental units
    return [
      { id: 'u1', name: 'یونیت ۱', number: 1, is_active: true },
      { id: 'u2', name: 'یونیت ۲', number: 2, is_active: true },
      { id: 'u3', name: 'یونیت ۳ (جراحی)', number: 3, is_active: true },
    ] as Unit[]
  }, [units])

  const getPatientDisplay = (appt: AppointmentWithRelations) => {
    const raw = appt.patient ? `${appt.patient.first_name} ${appt.patient.last_name}` : 'بیمار'
    return privacyMode ? maskPatientNameForPublicDisplay(raw) : raw
  }

  const getDoctorName = (doctorId?: string | null) => {
    if (!doctorId) return 'پزشک شیفت'
    const doc = doctors.find((d) => d.id === doctorId)
    return doc ? `دکتر ${doc.name || doc.specialty}` : 'پزشک شیفت'
  }

  const getUnitName = (unitId?: string | null) => {
    if (!unitId) return 'اتاق معاینه'
    const unit = units.find((u) => u.id === unitId)
    return unit ? unit.name : 'اتاق معاینه'
  }

  const formattedTime = currentTime.toLocaleTimeString('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between select-none overflow-x-hidden font-sans" dir="rtl">
      {/* ── Top Header Bar ── */}
      <header className="px-8 py-5 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between gap-4 shadow-xl z-20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-600 to-cyan-500 p-0.5 shadow-lg shadow-teal-500/20 flex items-center justify-center">
            <MinadentLogo className="w-9 h-9 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>کلینیک تخصصی دندانپزشکی مینا</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 font-medium">
                سالن انتظار
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">سامانه هوشمند فراخوان مراجعین و تریاژ نوبت‌ها</p>
          </div>
        </div>

        {/* Live Clock & Date */}
        <div className="flex items-center gap-6">
          <div className="text-left">
            <div className="text-3xl font-black font-mono tracking-wider text-teal-400 drop-shadow-sm">
              {toPersianDigits(formattedTime)}
            </div>
            <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5 justify-end mt-0.5">
              <Calendar size={13} className="text-teal-400" />
              <span>{toJalaliStringPretty(todayStr)}</span>
            </div>
          </div>

          {/* Controls toolbar */}
          <div className="flex items-center gap-2 pr-4 border-r border-slate-800">
            <button
              onClick={() => {
                handleTriggerCall({
                  patientName: 'علی رضایی',
                  unitName: 'یونیت ۱',
                  doctorName: 'احمدی',
                  turnNumber: 1,
                  fileNumber: 101,
                })
              }}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-teal-300 text-xs font-bold transition-all flex items-center gap-1.5"
              title="تست صدای فراخوان بیمار جهت بررسی بلندگوها"
            >
              <Sparkles size={14} className="text-teal-400" />
              <span className="hidden sm:inline">تست فراخوان</span>
            </button>

            <button
              onClick={() => setPrivacyMode(!privacyMode)}
              className={`p-2.5 rounded-xl border transition-all ${
                privacyMode
                  ? 'bg-teal-500/20 border-teal-500/40 text-teal-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
              title={privacyMode ? 'حالت حریم خصوصی فعال (نمایش نام مخفف)' : 'نمایش نام کامل'}
            >
              <Shield size={18} />
            </button>

            <button
              onClick={() => {
                const next = !audioEnabled
                setAudioEnabled(next)
                if (next) chimes.playSuccess()
              }}
              className={`p-2.5 rounded-xl border transition-all ${
                audioEnabled
                  ? 'bg-teal-500/20 border-teal-500/40 text-teal-300'
                  : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
              }`}
              title={audioEnabled ? 'اعلان صوتی فعال' : 'اعلان صوتی غیرفعال'}
            >
              {audioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-all"
              title="حالت تمام‌صفحه"
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Active Patient Call Hero Banner (When Announcement Triggers) ── */}
      {activeCall && (
        <div className="mx-8 mt-6 p-6 rounded-3xl bg-gradient-to-r from-teal-600 via-cyan-600 to-teal-700 text-white shadow-2xl shadow-teal-500/30 border-2 border-teal-300/40 animate-in fade-in zoom-in duration-300 relative overflow-hidden z-30">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="flex items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 animate-bounce shadow-inner">
                <BellRing size={42} className="text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="text-sm font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-white/20 text-teal-100 inline-block">
                    🔔 فراخوان بیمار به یونیت درمان
                  </span>
                  {activeCall.turnNumber && (
                    <span className="text-sm font-black px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-mono shadow-sm">
                      نوبت شماره {toPersianDigits(activeCall.turnNumber)}
                    </span>
                  )}
                  {activeCall.fileNumber && (
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-900/60 text-teal-200 border border-teal-300/40 font-mono">
                      پرونده: {toPersianDigits(activeCall.fileNumber)}
                    </span>
                  )}
                </div>
                <h2 className="text-4xl font-black tracking-tight text-white mt-1">
                  بیمار محترم:{' '}
                  <span className="text-amber-300 underline decoration-amber-300/40 underline-offset-8">
                    {privacyMode ? maskPatientNameForPublicDisplay(activeCall.patientName) : activeCall.patientName}
                  </span>
                </h2>
                <p className="text-lg text-teal-100 font-medium mt-2 flex items-center gap-2">
                  <span>لطفاً به</span>
                  <b className="text-white text-xl bg-black/20 px-3 py-1 rounded-xl">
                    {activeCall.unitName || 'اتاق معاینه'}
                  </b>
                  {activeCall.doctorName && (
                    <span>({`دکتر ${activeCall.doctorName}`})</span>
                  )}
                  <span>مراجعه فرمایید.</span>
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveCall(null)}
              className="px-5 py-2.5 rounded-xl bg-black/20 hover:bg-black/40 text-sm font-bold text-white transition-all self-start"
            >
              بستن اعلان
            </button>
          </div>
        </div>
      )}

      {/* ── Main Content Grid ── */}
      <main className="flex-1 px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Right Section: Waiting Room Queue (7 Cols) */}
        <section className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
                <Clock size={22} />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">صف حاضرین در سالن انتظار</h2>
                <p className="text-xs text-slate-400">مراجعینی که ورود خود را به پذیرش اعلام کرده‌اند</p>
              </div>
            </div>
            <div className="text-base font-black px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-teal-400">
              {toPersianDigits(waitingPatients.length)} نفر در انتظار
            </div>
          </div>

          {waitingPatients.length === 0 ? (
            <div className="p-12 rounded-3xl bg-slate-900/60 border border-slate-800/80 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 mb-3">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-300">سالن انتظار در حال حاضر خالی است</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                به محض اعلام حضور مراجعین در باجه پذیرش کلینیک، نام و نوبت در این بخش نمایش داده خواهد شد.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {waitingPatients.map((appt, idx) => {
                const waitMinutes = computeWaitingTimeMinutes(appt.check_in_time)
                const triage = getTriageWaitingStatus(waitMinutes)
                const patientName = getPatientDisplay(appt)
                const docName = getDoctorName(appt.doctor_id)
                const unitName = getUnitName(appt.unit_id)

                return (
                  <div
                    key={appt.id}
                    className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-teal-500/40 transition-all flex items-center justify-between gap-4 shadow-md"
                  >
                    <div className="flex items-center gap-4">
                      {/* Queue Number */}
                      <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex flex-col items-center justify-center text-teal-400 font-black">
                        <span className="text-[10px] text-slate-400">نوبت</span>
                        <span className="text-base leading-none">{toPersianDigits(idx + 1)}</span>
                      </div>

                      <div>
                        <h4 className="text-lg font-bold text-white flex items-center gap-2">
                          <span>{patientName}</span>
                          <span className="text-xs px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-300 border border-teal-500/20 font-medium">
                            پذیرش‌شده
                          </span>
                        </h4>
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <User size={12} className="text-slate-500" />
                            {docName}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Armchair size={12} className="text-slate-500" />
                            {unitName}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Waiting Duration and Actions */}
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={() => {
                          handleTriggerCall({
                            patientName: appt.patient ? `${appt.patient.first_name} ${appt.patient.last_name}` : 'بیمار',
                            unitName,
                            doctorName: docName.replace(/^دکتر\s*/, ''),
                            turnNumber: idx + 1,
                            fileNumber: appt.patient?.file_number,
                          })
                        }}
                        className="px-3 py-2 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 transition-all flex items-center gap-1.5 text-xs font-bold"
                        title="فراخوان مجدد این بیمار با صدای بلندگو"
                      >
                        <Volume2 size={15} />
                        <span>فراخوان</span>
                      </button>

                      <div className="text-left">
                        <span className={`text-xs px-2.5 py-1 rounded-lg border font-bold ${triage.badgeClass}`}>
                          ⏳ {formatWaitingTime(waitMinutes)}
                        </span>
                        <p className="text-[11px] text-slate-500 mt-1">
                          زمان ورود: {appt.check_in_time ? toPersianDigits(formatTime(appt.check_in_time)) : toPersianDigits(appt.start_time)}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Left Section: Active Dental Operatories / Chairs (5 Cols) */}
        <section className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <Armchair size={22} />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">وضعیت یونیت‌های کلینیک</h2>
                <p className="text-xs text-slate-400">اتاق‌های درمان و بیماران روی صندلی</p>
              </div>
            </div>
            <div className="text-base font-black px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400">
              {toPersianDigits(activeUnits.length)} یونیت
            </div>
          </div>

          <div className="space-y-3">
            {activeUnits.map((unit) => {
              // Check if any patient is currently in_chair in this unit
              const currentAppt = inChairPatients.find((a) => a.unit_id === unit.id)

              if (currentAppt) {
                const patientName = getPatientDisplay(currentAppt)
                const docName = getDoctorName(currentAppt.doctor_id)

                return (
                  <div
                    key={unit.id}
                    className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 shadow-lg relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                          <span className="text-base font-bold text-amber-300">{unit.name}</span>
                        </div>
                        <h4 className="text-lg font-black text-white mt-1.5">
                          {patientName}
                        </h4>
                        <p className="text-xs text-amber-200/70 mt-0.5">
                          پزشک معالج: {docName}
                        </p>
                      </div>

                      <div className="text-left shrink-0">
                        <span className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                          در حال درمان
                        </span>
                        <p className="text-[10px] text-slate-400 mt-1">
                          شروع: {currentAppt.chair_entry_time ? toPersianDigits(formatTime(currentAppt.chair_entry_time)) : toPersianDigits(currentAppt.start_time)}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              }

              return (
                <div
                  key={unit.id}
                  className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
                    <div>
                      <h4 className="text-base font-bold text-slate-200">{unit.name}</h4>
                      <p className="text-xs text-slate-500">آماده پذیرش بیمار بعدی</p>
                    </div>
                  </div>

                  <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                    آزاد
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      </main>

      {/* ── Bottom Marquee / Clinical Health Ticker ── */}
      <footer className="px-8 py-3.5 bg-slate-900/90 border-t border-slate-800 text-slate-400 flex items-center gap-4 text-xs font-medium z-10">
        <div className="flex items-center gap-1.5 text-teal-400 font-bold shrink-0 bg-teal-500/10 px-3 py-1 rounded-lg border border-teal-500/20">
          <Sparkles size={14} />
          <span>پیام سلامت</span>
        </div>
        <div className="overflow-hidden whitespace-nowrap w-full">
          <p className="inline-block text-slate-300 animate-marquee">
            مراجعین گرامی، به کلینیک دندانپزشکی مینا خوش آمدید • لطفاً به محض ورود جهت نوبت‌گیری به باجه پذیرش مراجعه فرمایید • چکاپ دوره‌ای هر ۶ ماه یک‌بار مانع از بروز مشکلات پیشرفته لثه و دندان می‌شود • مسواک زدن حداقل ۲ بار در روز و استفاده از نخ دندان ضامن حفظ لبخند زیبای شماست.
          </p>
        </div>
      </footer>
    </div>
  )
}
