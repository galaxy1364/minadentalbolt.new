import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { h } from '../lib/haptics'

/**
 * iOS 27 Bottom Sheet with Detents
 * Three stop heights: small (25%), medium (50%), large (90%).
 * Drag handle to resize. Backdrop dismiss. Spring physics.
 */

type Detent = 'small' | 'medium' | 'large'

const detentHeights: Record<Detent, string> = {
  small: '25vh',
  medium: '50vh',
  large: '90vh',
}

const detentOrder: Detent[] = ['small', 'medium', 'large']

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  detent?: Detent
  onDetentChange?: (d: Detent) => void
  children: React.ReactNode
}

export function BottomSheet({
  open,
  onClose,
  title,
  detent = 'medium',
  onDetentChange,
  children,
}: BottomSheetProps) {
  const [currentDetent, setCurrentDetent] = useState(detent)
  const [dragY, setDragY] = useState(0)
  const startYRef = useRef(0)
  const startDetentRef = useRef<Detent>(detent)
  const draggingRef = useRef(false)

  useEffect(() => { setCurrentDetent(detent) }, [detent])

  useEffect(() => {
    if (!open) return
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') { h.cancel(); onClose() } }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [open, onClose])

  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY
    startDetentRef.current = currentDetent
    draggingRef.current = true
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!draggingRef.current) return
    const delta = e.touches[0].clientY - startYRef.current
    setDragY(delta)
  }

  const handleTouchEnd = () => {
    if (!draggingRef.current) return
    draggingRef.current = false
    const currentIdx = detentOrder.indexOf(startDetentRef.current)
    const threshold = 40

    let newDetent = startDetentRef.current
    if (dragY < -threshold && currentIdx < 2) {
      newDetent = detentOrder[currentIdx + 1]
      h.light()
    } else if (dragY > threshold && currentIdx > 0) {
      newDetent = detentOrder[currentIdx - 1]
      h.light()
    }

    if (startDetentRef.current === 'small' && dragY > 80) {
      h.cancel()
      onClose()
      setDragY(0)
      return
    }

    setCurrentDetent(newDetent)
    onDetentChange?.(newDetent)
    setDragY(0)
  }

  if (!open) return null

  const baseHeight = parseFloat(detentHeights[currentDetent])
  const heightWithDrag = dragY !== 0 ? `calc(${detentHeights[currentDetent]} + ${dragY}px)` : detentHeights[currentDetent]

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[55] bg-black/30 backdrop-blur-sm"
        onClick={() => { h.cancel(); onClose() }}
        style={{ animation: 'page-in 0.25s ease-out' }}
      />
      <div
        className="fixed bottom-0 left-0 right-0 z-[56] bg-white dark:bg-slate-800 rounded-t-3xl shadow-ios-xl pb-safe"
        style={{
          height: heightWithDrag,
          transition: draggingRef.current ? 'none' : 'height 0.4s cubic-bezier(0.32,0.72,0,1)',
          animation: 'drawer-in 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          touchAction: 'none',
        }}
      >
        {/* Drag Handle */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="flex flex-col items-center pt-2 pb-1 cursor-grab active:cursor-grabbing"
        >
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600 mb-2" />
          {title && (
            <div className="flex items-center justify-between w-full px-5">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">{title}</h3>
              <button
                onClick={() => { h.cancel(); onClose() }}
                aria-label="بستن"
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all-smooth press-scale"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
          )}
        </div>
        {/* Detent indicators */}
        <div className="flex justify-center gap-1.5 pb-1">
          {detentOrder.map((d) => (
            <div
              key={d}
              className={`h-1 rounded-full transition-all-smooth ${
                d === currentDetent ? 'w-6 bg-primary-500' : 'w-1.5 bg-slate-300 dark:bg-slate-600'
              }`}
            />
          ))}
        </div>
        {/* Content */}
        <div className="overflow-y-auto px-5 pb-4" style={{ height: `calc(100% - 80px)` }}>
          {children}
        </div>
      </div>
    </>,
    document.body
  )
}
