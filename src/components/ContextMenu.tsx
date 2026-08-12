import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { h } from '../lib/haptics'

/**
 * iOS 27 Context Menu
 * Long-press activates a blurred backdrop with morphing menu items.
 * Works on touch (long-press) and mouse (right-click).
 */

export interface ContextMenuItem {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  variant?: 'default' | 'danger'
}

interface Position {
  x: number
  y: number
}

const LONG_PRESS_MS = 400

export function useContextMenu(items: ContextMenuItem[]) {
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 })
  const timerRef = useRef<number>(0)

  const open = useCallback((x: number, y: number) => {
    h.medium()
    const menuWidth = 200
    const menuHeight = items.length * 44 + 16
    const clampedX = Math.min(Math.max(x - menuWidth / 2, 8), window.innerWidth - menuWidth - 8)
    const clampedY = Math.min(Math.max(y - menuHeight / 2, 8), window.innerHeight - menuHeight - 8)
    setPosition({ x: clampedX, y: clampedY })
    setVisible(true)
  }, [items.length])

  const close = useCallback(() => {
    setVisible(false)
  }, [])

  const triggerProps = {
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault()
      open(e.clientX, e.clientY)
    },
    onTouchStart: (e: React.TouchEvent) => {
      const touch = e.touches[0]
      timerRef.current = window.setTimeout(() => {
        open(touch.clientX, touch.clientY)
      }, LONG_PRESS_MS)
    },
    onTouchMove: () => {
      clearTimeout(timerRef.current)
    },
    onTouchEnd: () => {
      clearTimeout(timerRef.current)
    },
  }

  const menu = visible ? (
    <ContextMenuOverlay position={position} items={items} onClose={close} />
  ) : null

  return { triggerProps, menu, open, close, visible }
}

function ContextMenuOverlay({
  position,
  items,
  onClose,
}: {
  position: Position
  items: ContextMenuItem[]
  onClose: () => void
}) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-md"
        onClick={onClose}
        style={{ animation: 'page-in 0.2s ease-out' }}
      />
      <div
        role="menu"
        aria-atomic="true"
        className="fixed z-[61] min-w-[180px] py-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-ios-xl border border-white/40 dark:border-white/10"
        style={{
          left: position.x,
          top: position.y,
          animation: 'modal-in 0.3s cubic-bezier(0.34,1.56,0.64,1) both',
        }}
      >
        {items.map((item, i) => (
          <button
            key={i}
            role="menuitem"
            onClick={() => { h.select(); item.onClick(); onClose() }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-slate-100/80 dark:hover:bg-slate-700/80 press-scale ${
              item.variant === 'danger'
                ? 'text-error-600 dark:text-error-400'
                : 'text-slate-700 dark:text-slate-200'
            }`}
            style={{ animation: `field-stagger 0.25s ease-out ${i * 30}ms both` }}
          >
            {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </>,
    document.body
  )
}
