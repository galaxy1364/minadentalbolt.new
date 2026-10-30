import { useEffect, useRef } from 'react'

/**
 * Makes an overlay (modal, bottom sheet, wizard, in-page sub-view) close on
 * the iOS edge-swipe-back gesture or the Android hardware/gesture back
 * button, instead of letting that gesture fall through to the router and
 * navigate the underlying page away (or, with nothing left in history, exit
 * the app).
 *
 * How: pushes one history entry per open overlay onto a shared in-memory
 * stack that mirrors real browser history. A back gesture/button pops the
 * real history entry, which fires exactly one `popstate` — only the
 * top-most tracked overlay reacts to it and closes, leaving anything nested
 * beneath it untouched. Overlays are expected to close top-down (the normal
 * UI pattern: you dismiss what's on top before what's under it).
 */

interface StackEntry {
  id: number
  onClose: () => void
}

const overlayStack: StackEntry[] = []
let nextId = 1
let suppressNextPopstate = false
let listenerAttached = false

function ensureListener() {
  if (listenerAttached) return
  listenerAttached = true
  window.addEventListener('popstate', () => {
    if (suppressNextPopstate) {
      suppressNextPopstate = false
      return
    }
    // A real back gesture/button only ever pops one entry — close just the
    // top-most tracked overlay, not everything that happens to be open.
    const top = overlayStack.pop()
    if (top) top.onClose()
  })
}

export function useBackDismiss(open: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    ensureListener()
    const id = nextId++
    window.history.pushState({ __overlayId: id }, '')
    const entry: StackEntry = { id, onClose: () => onCloseRef.current() }
    overlayStack.push(entry)

    return () => {
      const idx = overlayStack.indexOf(entry)
      if (idx === -1) {
        // Already consumed by a real popstate (the back gesture closed this
        // overlay itself) — nothing left to undo.
        return
      }
      overlayStack.splice(idx, 1)
      // Only unwind real browser history if our pushed entry is still the
      // current one. If something else navigated in the meantime (e.g. this
      // overlay closed itself while also routing to a new screen), calling
      // history.back() here would undo that navigation instead of just
      // discarding our own bookkeeping entry.
      if (window.history.state?.__overlayId === id) {
        suppressNextPopstate = true
        window.history.back()
      }
    }
  }, [open])
}
