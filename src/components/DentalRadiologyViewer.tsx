// DentalRadiologyViewer.tsx — Advanced Diagnostic Dental Image & X-Ray Viewer
// Features: Brightness/Contrast, Negative/Invert, Grayscale, Pan & Zoom, Digital Caliper measurement
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sun,
  Contrast,
  Sliders,
  Ruler,
  Maximize2,
  Minimize2,
  Sparkles,
  Eye,
  Crosshair,
} from 'lucide-react'

interface DentalRadiologyViewerProps {
  imageUrl: string
  title?: string
  toothNumber?: string | null
  onClose?: () => void
}

export function DentalRadiologyViewer({
  imageUrl,
  title,
  toothNumber,
  onClose,
}: DentalRadiologyViewerProps) {
  // Image adjustments
  const [brightness, setBrightness] = useState<number>(100)
  const [contrast, setContrast] = useState<number>(100)
  const [isInverted, setIsInverted] = useState<boolean>(false)
  const [isGrayscale, setIsGrayscale] = useState<boolean>(true) // X-rays default to high-clarity monochrome
  const [scale, setScale] = useState<number>(1)
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Caliper measurement tool
  const [isCaliperActive, setIsCaliperActive] = useState(false)
  const [caliperPoints, setCaliperPoints] = useState<{ x: number; y: number }[]>([])
  const containerRef = useRef<HTMLDivElement | null>(null)

  const handleReset = () => {
    setBrightness(100)
    setContrast(100)
    setIsInverted(false)
    setIsGrayscale(true)
    setScale(1)
    setPan({ x: 0, y: 0 })
    setCaliperPoints([])
    setIsCaliperActive(false)
  }

  // Presets
  const applyPreset = (preset: 'endo' | 'perio' | 'bone' | 'normal') => {
    switch (preset) {
      case 'endo': // High contrast for root canal files & apex
        setBrightness(115)
        setContrast(165)
        setIsInverted(false)
        setIsGrayscale(true)
        break
      case 'perio': // Inverted view for bone density loss & pocket depths
        setBrightness(105)
        setContrast(140)
        setIsInverted(true)
        setIsGrayscale(true)
        break
      case 'bone': // Subtle bone trabeculae enhancement
        setBrightness(95)
        setContrast(180)
        setIsInverted(false)
        setIsGrayscale(true)
        break
      case 'normal':
        handleReset()
        break
    }
  }

  // Zoom controls
  const handleZoom = (delta: number) => {
    setScale((prev) => Math.min(Math.max(prev + delta, 0.5), 4))
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY < 0 ? 0.15 : -0.15
    handleZoom(delta)
  }

  // Pan controls
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isCaliperActive) {
      // Handle caliper point placement
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const clickY = e.clientY - rect.top

      if (caliperPoints.length >= 2) {
        setCaliperPoints([{ x: clickX, y: clickY }])
      } else {
        setCaliperPoints((prev) => [...prev, { x: clickX, y: clickY }])
      }
      return
    }

    setIsDragging(true)
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || isCaliperActive) return
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Distance calculation for Caliper (approximate calibrated mm)
  const calculatedDistanceMm = useMemo(() => {
    if (caliperPoints.length < 2) return null
    const [p1, p2] = caliperPoints
    const dx = p1.x - p2.x
    const dy = p1.y - p2.y
    const pixelDistance = Math.sqrt(dx * dx + dy * dy)
    // Calibration factor: 100px roughly 10mm at standard zoom (scaled by zoom level)
    const mm = (pixelDistance / (10 * scale)).toFixed(1)
    return mm
  }, [caliperPoints, scale])

  const filterStyle = `
    brightness(${brightness}%)
    contrast(${contrast}%)
    ${isInverted ? 'invert(100%)' : ''}
    ${isGrayscale ? 'grayscale(100%)' : ''}
  `.trim()

  return (
    <div
      className={`flex flex-col bg-slate-950 text-slate-100 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'w-full'
      }`}
    >
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-200">
            {title || 'نمایشگر تشخیصی رادیولوژی'}
          </span>
          {toothNumber && (
            <span className="px-2 py-0.5 rounded-md bg-primary-950/80 text-primary-300 border border-primary-800 font-mono font-bold">
              دندان #{toothNumber}
            </span>
          )}
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 px-1 font-medium">فیلتر بالینی:</span>
          <button
            type="button"
            onClick={() => applyPreset('endo')}
            className="px-2 py-1 rounded-lg text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-amber-300 transition-all"
          >
            کانال/ریشه (Endo)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('perio')}
            className="px-2 py-1 rounded-lg text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-cyan-300 transition-all"
          >
            تحلیل استخوان (Perio)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('bone')}
            className="px-2 py-1 rounded-lg text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-emerald-300 transition-all"
          >
            تراکم استخوان
          </button>
          <button
            type="button"
            onClick={() => applyPreset('normal')}
            className="px-2 py-1 rounded-lg text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
          >
            عادی
          </button>
        </div>

        {/* Window controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
            title={isFullscreen ? 'خروج از تمام‌صفحه' : 'تمام‌صفحه'}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 hover:text-rose-200 text-slate-400 transition-all"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Viewport */}
      <div
        ref={containerRef}
        className={`relative w-full overflow-hidden bg-black flex items-center justify-center select-none ${
          isFullscreen ? 'flex-1' : 'h-[440px]'
        } ${isCaliperActive ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* The X-Ray Image */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.05s ease-out',
            filter: filterStyle,
          }}
          className="pointer-events-none origin-center"
        >
          <img
            src={imageUrl}
            alt="Dental Radiograph"
            className="max-h-[85vh] max-w-full object-contain pointer-events-none rounded shadow-2xl"
            draggable={false}
          />
        </div>

        {/* Caliper Measurement Overlay (SVG) */}
        {caliperPoints.length > 0 && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {caliperPoints.map((pt, idx) => (
              <circle
                key={idx}
                cx={pt.x}
                cy={pt.y}
                r={5}
                fill="#38bdf8"
                stroke="#0369a1"
                strokeWidth={2}
              />
            ))}
            {caliperPoints.length === 2 && (
              <>
                <line
                  x1={caliperPoints[0].x}
                  y1={caliperPoints[0].y}
                  x2={caliperPoints[1].x}
                  y2={caliperPoints[1].y}
                  stroke="#38bdf8"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                />
                {calculatedDistanceMm && (
                  <text
                    x={(caliperPoints[0].x + caliperPoints[1].x) / 2 + 10}
                    y={(caliperPoints[0].y + caliperPoints[1].y) / 2 - 10}
                    fill="#38bdf8"
                    fontSize={13}
                    fontWeight="bold"
                    className="drop-shadow"
                  >
                    ~{calculatedDistanceMm} mm
                  </text>
                )}
              </>
            )}
          </svg>
        )}

        {/* Measurement HUD */}
        {isCaliperActive && (
          <div className="absolute top-3 left-3 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-sky-500/50 backdrop-blur-md text-sky-300 text-xs font-mono flex items-center gap-2">
            <Crosshair size={14} className="animate-spin text-sky-400" />
            <span>
              {caliperPoints.length === 0 && 'نقطه اول را روی تصویر کلیک کنید'}
              {caliperPoints.length === 1 && 'نقطه دوم را کلیک کنید تا فاصله محاسبه شود'}
              {caliperPoints.length === 2 && `فاصله تخمینی: ~${calculatedDistanceMm} میلیمتر`}
            </span>
            {caliperPoints.length > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setCaliperPoints([])
                }}
                className="text-[10px] bg-slate-800 hover:bg-slate-700 px-1.5 py-0.5 rounded text-slate-300"
              >
                پاک کردن
              </button>
            )}
          </div>
        )}

        {/* Floating Zoom & Tool Bar */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 p-1 bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => handleZoom(0.2)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-200 transition-all"
            title="بزرگنمایی"
          >
            <ZoomIn size={15} />
          </button>
          <span className="text-[11px] font-mono px-1 text-slate-400">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => handleZoom(-0.2)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-200 transition-all"
            title="کوچکنمایی"
          >
            <ZoomOut size={15} />
          </button>

          <div className="h-4 w-px bg-slate-700 mx-0.5" />

          {/* Caliper Toggle */}
          <button
            type="button"
            onClick={() => {
              setIsCaliperActive(!isCaliperActive)
              if (!isCaliperActive) setCaliperPoints([])
            }}
            className={`p-1.5 rounded-lg transition-all flex items-center gap-1 text-[11px] ${
              isCaliperActive
                ? 'bg-sky-600 text-white font-bold'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
            title="خط‌کش کالیپر تشخیصی"
          >
            <Ruler size={15} />
            <span>خط‌کش</span>
          </button>

          <div className="h-4 w-px bg-slate-700 mx-0.5" />

          <button
            type="button"
            onClick={handleReset}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all"
            title="بازنشانی به حالت پیش‌فرض"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Bottom Adjustment Controls */}
      <div className="p-3 bg-slate-900/95 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        {/* Brightness */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1">
              <Sun size={13} className="text-amber-400" />
              روشنایی (Brightness)
            </span>
            <span className="font-mono text-[11px] text-slate-300">{brightness}%</span>
          </div>
          <input
            type="range"
            min="40"
            max="200"
            value={brightness}
            onChange={(e) => setBrightness(Number(e.target.value))}
            className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Contrast */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1">
              <Contrast size={13} className="text-cyan-400" />
              کنتراست (Contrast)
            </span>
            <span className="font-mono text-[11px] text-slate-300">{contrast}%</span>
          </div>
          <input
            type="range"
            min="50"
            max="250"
            value={contrast}
            onChange={(e) => setContrast(Number(e.target.value))}
            className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Toggles */}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setIsInverted(!isInverted)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
              isInverted
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {isInverted ? '✓ نگاتیو فعال' : 'نگاتیو (Invert)'}
          </button>

          <button
            type="button"
            onClick={() => setIsGrayscale(!isGrayscale)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
              isGrayscale
                ? 'bg-sky-600 text-white border-sky-500 font-bold'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            سیاه‌وسفید (BW)
          </button>
        </div>
      </div>
    </div>
  )
}
