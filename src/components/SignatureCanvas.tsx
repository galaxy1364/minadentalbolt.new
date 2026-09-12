// SignatureCanvas.tsx — Touch and mouse enabled digital signature pad for tablet/mobile
import React, { useRef, useState, useEffect, useCallback } from 'react'
import { RotateCcw, Check, PenTool } from 'lucide-react'

interface SignatureCanvasProps {
  value?: string | null
  onChange: (dataUrl: string | null) => void
  label?: string
}

export function SignatureCanvas({ value, onChange, label = 'امضای دیجیتال بیمار یا ولی بیمار' }: SignatureCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [hasSignature, setHasSignature] = useState(Boolean(value))
  const isDrawingRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  const lastDrawnValueRef = useRef<string | null>(value || null)

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return

    const dpr = Math.max(window.devicePixelRatio || 1, 2)
    canvas.width = Math.floor(rect.width * dpr)
    canvas.height = Math.floor(rect.height * dpr)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr, dpr)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 2.5

    if (value) {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height)
        setHasSignature(true)
      }
      img.src = value
    }
  }, [value])

  // Mount & value synchronization
  useEffect(() => {
    // If value changed from the outside (not from user drawing)
    if (value !== lastDrawnValueRef.current) {
      lastDrawnValueRef.current = value || null
      setHasSignature(Boolean(value))
      setupCanvas()
    }
  }, [value, setupCanvas])

  // ResizeObserver for modal / drawer open animations
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const ro = new ResizeObserver(() => {
      const canvas = canvasRef.current
      if (canvas && (!hasSignature || !value)) {
        setupCanvas()
      }
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [setupCanvas, hasSignature, value])

  const getPoint = (e: MouseEvent | Touch): { x: number; y: number } => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  // Native non-passive touch listeners to guarantee no-scroll on mobile/tablet
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onStart = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      isDrawingRef.current = true
      const point = 'touches' in e ? getPoint(e.touches[0]) : getPoint(e)
      lastPointRef.current = point
      ctx.beginPath()
      ctx.moveTo(point.x, point.y)
      ctx.lineTo(point.x + 0.1, point.y + 0.1)
      ctx.stroke()
      setHasSignature(true)
    }

    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!isDrawingRef.current) return
      e.preventDefault()
      const ctx = canvas.getContext('2d')
      if (!ctx || !lastPointRef.current) return

      const currentPoint = 'touches' in e ? getPoint(e.touches[0]) : getPoint(e)
      const midPoint = {
        x: (lastPointRef.current.x + currentPoint.x) / 2,
        y: (lastPointRef.current.y + currentPoint.y) / 2,
      }

      ctx.quadraticCurveTo(lastPointRef.current.x, lastPointRef.current.y, midPoint.x, midPoint.y)
      ctx.stroke()
      lastPointRef.current = currentPoint
      setHasSignature(true)
    }

    const onEnd = (e: MouseEvent | TouchEvent) => {
      if (!isDrawingRef.current) return
      e.preventDefault()
      isDrawingRef.current = false
      lastPointRef.current = null
      const dataUrl = canvas.toDataURL('image/png')
      lastDrawnValueRef.current = dataUrl
      onChange(dataUrl)
    }

    // Touch events (passive: false is essential for e.preventDefault on iOS/Android)
    canvas.addEventListener('touchstart', onStart, { passive: false })
    canvas.addEventListener('touchmove', onMove, { passive: false })
    canvas.addEventListener('touchend', onEnd, { passive: false })
    canvas.addEventListener('touchcancel', onEnd, { passive: false })

    // Mouse events
    canvas.addEventListener('mousedown', onStart)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onEnd)

    return () => {
      canvas.removeEventListener('touchstart', onStart)
      canvas.removeEventListener('touchmove', onMove)
      canvas.removeEventListener('touchend', onEnd)
      canvas.removeEventListener('touchcancel', onEnd)
      canvas.removeEventListener('mousedown', onStart)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onEnd)
    }
  }, [onChange])

  const handleClear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const dpr = Math.max(window.devicePixelRatio || 1, 2)
    ctx.scale(dpr, dpr)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 2.5
    lastDrawnValueRef.current = null
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
            className="flex items-center gap-1 text-[11px] text-error-500 hover:text-error-600 font-medium transition-colors"
          >
            <RotateCcw size={12} />
            پاک کردن امضا
          </button>
        )}
      </div>

      <div
        ref={containerRef}
        className="relative w-full h-36 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/60 overflow-hidden touch-none select-none"
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair block touch-none"
        />
        {!hasSignature && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 text-xs">
            <span className="font-medium">با قلم یا انگشت در این کادر امضا کنید</span>
            <span className="text-[10px] mt-0.5 opacity-70">امضای دیجیتال جهت ثبت قانونی در پرونده</span>
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
