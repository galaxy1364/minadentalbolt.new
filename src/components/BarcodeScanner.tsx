// BarcodeScanner.tsx — reads barcodes (Code128, EAN-13, QR, etc.) using
// the device's own camera, via @zxing/library which decodes camera
// frames in pure JS. Deliberately NOT using the native BarcodeDetector
// Web API even though it needs no dependency — it isn't supported in
// Safari/iOS, and this app's own users have been testing on iPhone, so
// a "camera-native-API-only" scanner would silently fail to work on
// their own device. zxing works identically on any browser with camera
// access.
import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/library'
import { X, Camera as CameraIcon, AlertCircle } from 'lucide-react'
import { h } from '../lib/haptics'

interface BarcodeScannerProps {
  onScan: (code: string) => void
  onClose: () => void
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(true)

  useEffect(() => {
    const reader = new BrowserMultiFormatReader()
    readerRef.current = reader
    let cancelled = false

    reader.decodeFromVideoDevice(null, videoRef.current!, (result, err) => {
      if (cancelled) return
      if (result && scanning) {
        setScanning(false)
        h.success()
        onScan(result.getText())
      }
      // NotFoundException fires continuously while no code is in frame —
      // that's normal scanning, not a real error, so it's ignored here.
    }).catch((err) => {
      if (cancelled) return
      setError(err?.name === 'NotAllowedError' ? 'اجازه‌ی دسترسی به دوربین داده نشد' : 'دوربین در دسترس نیست')
    })

    return () => {
      cancelled = true
      reader.reset()
    }
  }, [])

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      <div className="flex items-center justify-between p-4">
        <button onClick={() => { h.tap(); onClose() }} className="p-2 rounded-full bg-white/10 text-white"><X size={20} /></button>
        <p className="text-white text-sm font-bold">اسکن بارکد</p>
        <div className="w-9" />
      </div>
      <div className="flex-1 relative overflow-hidden">
        {error ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 px-8 text-center">
            <AlertCircle size={40} className="text-error-400" />
            <p className="text-white text-sm">{error}</p>
            <p className="text-white/60 text-xs">می‌توانید کد را دستی وارد کنید</p>
          </div>
        ) : (
          <>
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-40 border-2 border-white/80 rounded-2xl shadow-[0_0_0_2000px_rgba(0,0,0,0.5)]" />
            </div>
            <div className="absolute bottom-8 inset-x-0 flex items-center justify-center gap-2 text-white/80 text-xs">
              <CameraIcon size={14} /> بارکد را داخل کادر نگه دارید
            </div>
          </>
        )}
      </div>
    </div>
  )
}
