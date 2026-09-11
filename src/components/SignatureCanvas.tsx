// SignatureCanvas.tsx — Touch and mouse enabled digital signature pad for tablet/mobile
import React, { useRef, useState, useEffect } from 'react'
import { RotateCcw, Check, PenTool } from 'lucide-react'

interface SignatureCanvasProps {
  value?: string | null
  onChange: (dataUrl: string | null) => void
  label?: string
}

export function SignatureCanvas({ value, onChange, label = 'امضای دیجیتال بیمار یا ولی بیمار' }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(Boolean(value))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set high-DPI scaling
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * 2
    canvas.height = rect.height * 2
    ctx.scale(2, 2)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 2.5

    // If pre-existing signature image
    if (value) {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height)
        setHasSignature(true)
      }
      img.src = value
    }
  }, [value])

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      const touch = e.touches[0]
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      }
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    }
  }

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { x, y } = getCoordinates(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { x, y } = getCoordinates(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasSignature(true)
  }

  const stopDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    e.preventDefault()
    setIsDrawing(false)
    const canvas = canvasRef.current
    if (canvas) {
      onChange(canvas.toDataURL('image/png'))
    }
  }

  const handleClear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
    onChange(null)
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <PenTool size={13} className="text-primary-600" />
          {label}
        </label>
        {hasSignature && (
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1 text-[11px] text-error-500 hover:text-error-600 font-medium"
          >
            <RotateCcw size={12} />
            پاک کردن امضا
          </button>
        )}
      </div>

      <div className="relative w-full h-36 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/60 overflow-hidden touch-none select-none">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair block"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasSignature && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 text-xs">
            <span className="font-medium">با قلم یا انگشت در این کادر امضا کنید</span>
            <span className="text-[10px] mt-0.5 opacity-70">Sign with touch or mouse</span>
          </div>
        )}
      </div>
      {hasSignature && (
        <p className="text-[11px] text-success-600 dark:text-success-400 flex items-center gap-1 font-medium">
          <Check size={13} /> امضا ثبت شد
        </p>
      )}
    </div>
  )
}
