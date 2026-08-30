// PatientAlerts.tsx — the red cards that interrupt whoever opens a file.
//
// All the decisions about WHAT to show live in lib/patientAlerts.ts so
// they can be tested. This file only decides how it looks.
import { useState, useEffect, useMemo } from 'react'
import { X, AlertTriangle, HeartPulse, Pill, Wallet } from 'lucide-react'
import { buildPatientAlerts } from '../lib/patientAlerts'
import type { PatientAlert, PatientAlertKind, AlertPatientFields, AlertBalance } from '../lib/patientAlerts'
import { toPersianDigits } from '../lib/persianDate'

const ICONS: Record<PatientAlertKind, React.ReactNode> = {
  allergy: <AlertTriangle size={16} />,
  condition: <HeartPulse size={16} />,
  medication: <Pill size={16} />,
  debt: <Wallet size={16} />,
}

/** Clinical alerts are red; the money one is amber. A dentist scanning
 * the corner should be able to tell "this could hurt the patient" from
 * "this costs the clinic" without reading either. */
const STYLES: Record<PatientAlertKind, string> = {
  allergy: 'bg-error-600 text-white border-error-700',
  condition: 'bg-error-500 text-white border-error-600',
  medication: 'bg-error-500 text-white border-error-600',
  debt: 'bg-amber-500 text-white border-amber-600',
}

interface Props {
  patient: AlertPatientFields | null
  balance: AlertBalance | null
}

export function PatientAlerts({ patient, balance }: Props) {
  const alerts = useMemo(
    () => (patient ? buildPatientAlerts(patient, balance) : []),
    [patient, balance],
  )

  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  // Dismissal is per patient and per visit to the file, never persisted.
  // An allergy that was acknowledged last month must interrupt again the
  // next time the file is opened — that is the entire point of the card.
  useEffect(() => { setDismissed(new Set()) }, [patient?.id])

  const visible = alerts.filter((a) => !dismissed.has(a.id))
  if (visible.length === 0) return null

  return (
    <div
      className="fixed top-20 left-4 z-40 flex flex-col gap-2 max-w-xs w-[min(20rem,calc(100vw-2rem))]"
      role="alert"
      aria-live="polite"
    >
      {visible.map((alert) => (
        <AlertCard
          key={alert.id}
          alert={alert}
          onDismiss={() => setDismissed((prev) => new Set(prev).add(alert.id))}
        />
      ))}
    </div>
  )
}

function AlertCard({ alert, onDismiss }: { alert: PatientAlert; onDismiss: () => void }) {
  return (
    <div className={`rounded-xl border shadow-lg px-3 py-2.5 flex items-start gap-2 ${STYLES[alert.kind]}`}>
      <span className="mt-0.5 flex-shrink-0">{ICONS[alert.kind]}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold">{alert.title}</p>
        <p className="text-sm leading-6 break-words">
          {/* Persian digits so a balance reads the way the rest of the
              app writes numbers. */}
          {toPersianDigits(alert.items.join(' — '))}
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={`بستن هشدار ${alert.title}`}
        className="flex-shrink-0 p-1 rounded-lg hover:bg-white/20 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  )
}
