import { useRef, useState, useCallback, useEffect } from 'react'
import { h } from './haptics'

const THRESHOLD = 70
const MAX_PULL = 120

/** True page scroll position — the actual scrolling element is the
 * document/body (main has no overflow-y set), not the wrapper div this
 * hook's containerRef gets attached to. Checking that inner div's own
 * (always-zero) scrollTop was the bug: it made pulling-mode trigger on
 * every touch anywhere on the page, not just at the real top, causing
 * constant re-renders during any touch-scroll gesture — visible as
 * scroll stutter/stall, especially on Android's rendering engine. */
function isAtPageTop(): boolean {
  if (typeof window === 'undefined') return true
  return (window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0) <= 0
}

export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startYRef = useRef(0)
  const pullingRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isAtPageTop() && !isRefreshing) {
      startYRef.current = e.touches[0].clientY
      pullingRef.current = true
    } else {
      pullingRef.current = false
    }
  }, [isRefreshing])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pullingRef.current || isRefreshing) return
    // Re-check on every move — if the page has scrolled away from the top
    // (e.g. the user started the gesture right at the top but is now
    // scrolling normally), stop treating this as a pull gesture.
    if (!isAtPageTop()) {
      pullingRef.current = false
      setPullDistance(0)
      return
    }
    const delta = e.touches[0].clientY - startYRef.current
    if (delta <= 0) {
      setPullDistance(0)
      return
    }
    const diminished = Math.min(delta * 0.5, MAX_PULL)
    // Batch via rAF instead of setting state synchronously on every touch
    // event — this is what caused visible jank/stutter on Android.
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => setPullDistance(diminished))
  }, [isRefreshing])

  const handleTouchEnd = useCallback(async () => {
    if (!pullingRef.current) return
    pullingRef.current = false
    if (pullDistance >= THRESHOLD) {
      h.medium()
      setIsRefreshing(true)
      setPullDistance(THRESHOLD)
      try {
        await onRefresh()
      } catch (err) {
        console.error('Pull to refresh error:', err)
      } finally {
        setIsRefreshing(false)
        setPullDistance(0)
      }
    } else {
      setPullDistance(0)
    }
  }, [pullDistance, onRefresh])

  const pullProgress = Math.min(pullDistance / THRESHOLD, 1)

  const handlers = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  }

  useEffect(() => {
    return () => { pullingRef.current = false; if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [])

  return { containerRef, pullDistance, pullProgress, isRefreshing, handlers }
}
