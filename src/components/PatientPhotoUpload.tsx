// PatientPhotoUpload.tsx — capture or pick a patient photo from the
// device (camera or gallery), compress it client-side, and store it
// as a data URL directly in the existing avatar_url text column — no
// Supabase Storage bucket setup needed for a single small profile
// photo per patient.
import { useRef, useState } from 'react'
import { Camera, X, User } from 'lucide-react'
import { h } from '../lib/haptics'

function compressImage(file: File, maxSize = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('canvas unsupported'))
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.onerror = reject
      img.src = reader.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function PatientPhotoUpload({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setLoading(true)
    try {
      const dataUrl = await compressImage(file)
      onChange(dataUrl)
      h.success()
    } catch {
      h.error()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-700 flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-md">
          {value ? (
            <img src={value} alt="" className="w-full h-full object-cover" />
          ) : (
            <User size={28} className="text-slate-300" />
          )}
        </div>
        {value && (
          <button
            type="button"
            onClick={() => { h.tap(); onChange('') }}
            className="absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full bg-error-500 text-white flex items-center justify-center shadow"
          >
            <X size={12} />
          </button>
        )}
      </div>
      <div>
        <button
          type="button"
          onClick={() => { h.tap(); fileInputRef.current?.click() }}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-xs font-bold disabled:opacity-50"
        >
          <Camera size={14} /> {loading ? 'در حال پردازش...' : value ? 'تغییر عکس' : 'افزودن عکس'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
    </div>
  )
}
