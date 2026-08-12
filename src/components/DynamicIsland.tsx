import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { h } from '../lib/haptics'

/**
 * iOS 27 Dynamic Island
 * Morphing pill at top of screen that expands to show notifications.
 * States: collapsed, expanded, compact-left, compact-right.
 */

export type IslandState = 'collapsed' | 'expanded' | 'compact'

export interface IslandNotification {
  id: string
  icon?: React.ReactNode
  title: string
  message?: string
  duration?: number
  color?: string
}

let pushCallback: ((n: IslandNotification) => void) | null = null

export function pushIslandNotification(n: IslandNotification) {
  pushCallback?.(n)
}

export function DynamicIsland() {
  const [state, setState] = useState<IslandState>('collapsed')
  const [notification, setNotification] = useState<IslandNotification | null>(null)
  const timeoutRef = useRef<number>(0)

  const dismiss = useCallback(() => {
    setState('collapsed')
    setTimeout(() => setNotification(null), 300)
  }, [])

  useEffect(() => {
    pushCallback = (n: IslandNotification) => {
      h.morph()
      setNotification(n)
      setState('compact')
      setTimeout(() => setState('expanded'), 100)
      clearTimeout(timeoutRef.current)
      const dur = n.duration ?? 4000
      timeoutRef.current = window.setTimeout(() => {
        dismiss()
      }, dur)
    }
    return () => { pushCallback = null; clearTimeout(timeoutRef.current) }
  }, [dismiss])

  if (!notification) return null

  const isExpanded = state === 'expanded'
  const isCompact = state === 'compact'

  return createPortal(
    <div
      className="fixed top-2 left-1/2 -translate-x-1/2 z-[70] flex justify-center"
      style={{ pointerEvents: isExpanded ? 'auto' : 'none' }}
    >
      <div
        onClick={isExpanded ? dismiss : undefined}
        className="bg-black dark:bg-black rounded-[28px] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer overflow-hidden"
        style={{
          width: isExpanded ? 'min(340px, calc(100vw - 24px))' : isCompact ? '200px' : '120px',
          height: isExpanded ? 'auto' : '36px',
          minHeight: '36px',
          padding: isExpanded ? '12px 16px' : '0 16px',
          opacity: 1,
        }}
      >
        {isExpanded && notification ? (
          <div className="flex items-center gap-3 animate-[modal-in_0.3s_ease-out]">
            {notification.icon && (
              <div
                className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-white"
                style={{ background: notification.color || '#0d9488' }}
              >
                {notification.icon}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-white truncate">{notification.title}</p>
              {notification.message && (
                <p className="text-[11px] text-white/70 truncate">{notification.message}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-9 gap-2">
            {notification.icon && (
              <div
                className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-white"
                style={{ background: notification.color || '#0d9488' }}
              >
                {React.cloneElement(notification.icon as React.ReactElement, { size: 12 })}
              </div>
            )}
            <span className="text-[11px] font-medium text-white/80 truncate max-w-[140px]">
              {notification.title}
            </span>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
