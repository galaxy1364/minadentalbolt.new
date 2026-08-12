import { useRef, useState, useCallback, useEffect } from 'react'
import { h } from './haptics'

const THRESHOLD = 70
const MAX_PULL = 120

export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startYRef = useRef(0)
  const pullingRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop <= 0 && !isRefreshing) {
      startYRef.current = e.touches[0].clientY
      pullingRef.current = true
    }
  }, [isRefreshing])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pullingRef.current || isRefreshing) return
    const delta = e.touches[0].clientY - startYRef.current
    if (delta <= 0) {
      setPullDistance(0)
      return
    }
    const diminished = Math.min(delta * 0.5, MAX_PULL)
    setPullDistance(diminished)
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
    return () => { pullingRef.current = false }
  }, [])

  return { containerRef, pullDistance, pullProgress, isRefreshing, handlers }
}
