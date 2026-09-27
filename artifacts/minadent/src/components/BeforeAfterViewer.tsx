import React, { useState, useRef } from 'react'
import { Split, Columns, Eye, RotateCcw, X, ZoomIn, Sparkles } from 'lucide-react'
import { toJalaliStringPretty } from '../lib/persianDate'
import { h } from '../lib/haptics'
import { chimes } from '../lib/chimes'

export interface BeforeAfterViewerProps {
  beforeUrl: string
  afterUrl: string
  title?: string
  procedureName?: string
  beforeDate?: string
  afterDate?: string
  onClose?: () => void
}

export function BeforeAfterViewer({
  beforeUrl,
  afterUrl,
  title = 'مقایسه قبل و بعد از درمان',
  procedureName,
  beforeDate,
  afterDate,
  onClose,
}: BeforeAfterViewerProps) {
  const [sliderPos, setSliderPos] = useState<number>(50) // percentage 0 - 100
  const [mode, setMode] = useState<'slider' | 'side-by-side'>('slider')
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const handlePointerMove = (clientX: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const percent = Math.min(Math.max((x / rect.width) * 100, 0), 100)
    setSliderPos(percent)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    handlePointerMove(e.touches[0].clientX)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    handlePointerMove(e.clientX)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col justify-between p-3 md:p-6 select-none animate-fade-in">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between text-white pb-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-600/30 border border-primary-500/40 flex items-center justify-center text-primary-300">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <span>{title}</span>
              {procedureName && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary-500/20 text-primary-300 border border-primary-500/30">
                  {procedureName}
                </span>
              )}
            </h3>
            <p className="text-xs text-white/60 mt-0.5">
              مقایسه بالینی نتایج درمان (COMP-42)
            </p>
          </div>
        </div>

        {/* View Mode Switches */}
        <div className="flex items-center gap-2">
          <div className="bg-white/10 p-1 rounded-xl flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                h.select()
                chimes.playPop()
                setMode('slider')
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                mode === 'slider'
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <Split size={14} />
              <span>اسلایدر شناور</span>
            </button>
            <button
              type="button"
              onClick={() => {
                h.select()
                chimes.playPop()
                setMode('side-by-side')
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                mode === 'side-by-side'
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <Columns size={14} />
              <span>کنار هم</span>
            </button>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={() => {
                h.cancel()
                onClose()
              }}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 transition-colors"
              aria-label="بستن پنجره"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center p-2 min-h-0 overflow-hidden">
        {mode === 'slider' ? (
          <div
            ref={containerRef}
            className="relative w-full max-w-4xl h-[70vh] rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-slate-950 cursor-ew-resize select-none"
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
            onMouseMove={handleMouseMove}
            onTouchStart={() => setIsDragging(true)}
            onTouchEnd={() => setIsDragging(false)}
            onTouchMove={handleTouchMove}
          >
            {/* After Image (Background, Full) */}
            <img
              src={afterUrl}
              alt="بعد از درمان"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            />
            <div className="absolute top-4 left-4 z-10 px-3 py-1 rounded-lg bg-emerald-600/90 text-white text-xs font-bold shadow-lg backdrop-blur-sm">
              بعد از درمان {afterDate && `(${toJalaliStringPretty(afterDate)})`}
            </div>

            {/* Before Image (Foreground, Clipped) */}
            <div
              className="absolute inset-0 overflow-hidden pointer-events-none"
              style={{ width: `${sliderPos}%` }}
            >
              <img
                src={beforeUrl}
                alt="قبل از درمان"
                className="absolute inset-0 w-full h-full object-contain"
                style={{ width: containerRef.current?.clientWidth || '100%', maxWidth: 'none' }}
              />
              <div className="absolute top-4 right-4 z-10 px-3 py-1 rounded-lg bg-amber-600/90 text-white text-xs font-bold shadow-lg backdrop-blur-sm">
                قبل از درمان {beforeDate && `(${toJalaliStringPretty(beforeDate)})`}
              </div>
            </div>

            {/* Divider Handle */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] z-20 flex items-center justify-center pointer-events-none"
              style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}
            >
              <div className="w-8 h-8 rounded-full bg-white text-slate-900 shadow-xl flex items-center justify-center text-xs font-black border-2 border-primary-500">
                ⮂ ⮃
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-5xl h-[70vh]">
            {/* Before Card */}
            <div className="relative rounded-2xl overflow-hidden border border-white/20 bg-slate-950 flex items-center justify-center shadow-xl">
              <img src={beforeUrl} alt="قبل از درمان" className="max-h-full max-w-full object-contain" />
              <div className="absolute top-4 right-4 px-3 py-1 rounded-lg bg-amber-600/90 text-white text-xs font-bold shadow-lg backdrop-blur-sm">
                قبل از درمان {beforeDate && `(${toJalaliStringPretty(beforeDate)})`}
              </div>
            </div>

            {/* After Card */}
            <div className="relative rounded-2xl overflow-hidden border border-white/20 bg-slate-950 flex items-center justify-center shadow-xl">
              <img src={afterUrl} alt="بعد از درمان" className="max-h-full max-w-full object-contain" />
              <div className="absolute top-4 left-4 px-3 py-1 rounded-lg bg-emerald-600/90 text-white text-xs font-bold shadow-lg backdrop-blur-sm">
                بعد از درمان {afterDate && `(${toJalaliStringPretty(afterDate)})`}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-white/70 text-xs pt-3 border-t border-white/10">
        <span>برای مقایسه دقیق‌تر، خط کشویی وسط را به چپ و راست حرکت دهید.</span>
        <button
          type="button"
          onClick={() => {
            h.tap()
            setSliderPos(50)
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <RotateCcw size={12} />
          <span>بازنشانی به وسط (۵۰٪)</span>
        </button>
      </div>
    </div>
  )
}
