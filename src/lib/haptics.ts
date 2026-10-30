// ─────────────────────────────────────────────────────────────────
// iOS 27 Haptic + Sound Engine — Full Package
// Real Web Vibration API + Web Audio API synthesis
// Mirrors Apple's CHHapticEngine patterns: transient + continuous
// ─────────────────────────────────────────────────────────────────

type HapticPattern =
  | 'light' | 'medium' | 'heavy' | 'soft' | 'rigid'
  | 'success' | 'warning' | 'error' | 'selection'
  | 'impact' | 'notify' | 'prepare' | 'release' | 'peek' | 'pop'
  | 'transition' | 'morph' | 'absorb'

type SoundType =
  | 'tap' | 'select' | 'confirm' | 'success' | 'error' | 'delete'
  | 'swipe' | 'pop' | 'toggle' | 'cancel' | 'tick' | 'morph'
  | 'transition' | 'notify' | 'release' | 'prepare'

// ── Vibration patterns (ms) ──────────────────────────────────────

const vibratePatterns: Record<HapticPattern, number | number[]> = {
  light:       10,
  medium:      22,
  heavy:       45,
  soft:        8,
  rigid:       18,
  selection:   5,
  success:     [10, 50, 10, 50, 10],
  warning:     [25, 50, 25],
  error:       [45, 35, 45, 35, 45],
  impact:      [12, 8, 30],
  notify:      [15, 40, 15],
  prepare:     [8],
  release:     [6],
  peek:        [4],
  pop:         [14, 4],
  transition:  [10, 20, 10],
  morph:       [8, 12, 8],
  absorb:      [20, 30],
}

// ── Web Audio synthesis ──────────────────────────────────────────

let audioCtx: AudioContext | null = null

function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)() }
    catch { return null }
  }
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {})
  return audioCtx
}

function playSound(type: SoundType) {
  const ctx = getAudioCtx()
  if (!ctx) return

  const now = ctx.currentTime
  const master = ctx.createGain()
  master.connect(ctx.destination)

  const profiles: Record<SoundType, () => void> = {
    tap: () => {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.setValueAtTime(820, now)
      o.frequency.exponentialRampToValueAtTime(580, now + 0.025)
      master.gain.setValueAtTime(0.07, now)
      master.gain.exponentialRampToValueAtTime(0.001, now + 0.035)
      o.connect(master); o.start(now); o.stop(now + 0.04)
    },
    select: () => {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.setValueAtTime(1200, now)
      o.frequency.exponentialRampToValueAtTime(880, now + 0.018)
      master.gain.setValueAtTime(0.05, now)
      master.gain.exponentialRampToValueAtTime(0.001, now + 0.025)
      o.connect(master); o.start(now); o.stop(now + 0.03)
    },
    confirm: () => {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.setValueAtTime(600, now)
      o.frequency.exponentialRampToValueAtTime(950, now + 0.08)
      master.gain.setValueAtTime(0.09, now)
      master.gain.exponentialRampToValueAtTime(0.001, now + 0.1)
      o.connect(master); o.start(now); o.stop(now + 0.12)
    },
    success: () => {
      const freqs = [523.25, 659.25, 783.99]
      freqs.forEach((f, i) => {
        const o = ctx.createOscillator()
        const g = ctx.createGain()
        o.type = 'sine'; o.frequency.value = f
        g.gain.setValueAtTime(0, now + i * 0.05)
        g.gain.linearRampToValueAtTime(0.07, now + i * 0.05 + 0.008)
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.14)
        o.connect(g); g.connect(ctx.destination)
        o.start(now + i * 0.05); o.stop(now + i * 0.05 + 0.15)
      })
    },
    error: () => {
      const o = ctx.createOscillator()
      o.type = 'sawtooth'
      o.frequency.setValueAtTime(200, now)
      o.frequency.exponentialRampToValueAtTime(140, now + 0.15)
      master.gain.setValueAtTime(0.09, now)
      master.gain.exponentialRampToValueAtTime(0.001, now + 0.2)
      o.connect(master); o.start(now); o.stop(now + 0.22)
    },
    delete: () => {
      const o = ctx.createOscillator()
      o.type = 'triangle'
      o.frequency.setValueAtTime(420, now)
      o.frequency.exponentialRampToValueAtTime(90, now + 0.14)
      master.gain.setValueAtTime(0.07, now)
      master.gain.exponentialRampToValueAtTime(0.001, now + 0.17)
      o.connect(master); o.start(now); o.stop(now + 0.19)
    },
    swipe: () => {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.setValueAtTime(280, now)
      o.frequency.linearRampToValueAtTime(520, now + 0.09)
      master.gain.setValueAtTime(0.035, now)
      master.gain.exponentialRampToValueAtTime(0.001, now + 0.11)
      o.connect(master); o.start(now); o.stop(now + 0.13)
    },
    pop: () => {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.setValueAtTime(1600, now)
      o.frequency.exponentialRampToValueAtTime(200, now + 0.04)
      master.gain.setValueAtTime(0.09, now)
      master.gain.exponentialRampToValueAtTime(0.001, now + 0.05)
      o.connect(master); o.start(now); o.stop(now + 0.06)
    },
    toggle: () => {
      const o = ctx.createOscillator()
      o.type = 'square'
      o.frequency.setValueAtTime(1000, now)
      master.gain.setValueAtTime(0.04, now)
      master.gain.exponentialRampToValueAtTime(0.001, now + 0.025)
      o.connect(master); o.start(now); o.stop(now + 0.03)
    },
    cancel: () => {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.setValueAtTime(400, now)
      o.frequency.exponentialRampToValueAtTime(280, now + 0.05)
      master.gain.setValueAtTime(0.05, now)
      master.gain.exponentialRampToValueAtTime(0.001, now + 0.07)
      o.connect(master); o.start(now); o.stop(now + 0.09)
    },
    tick: () => {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.setValueAtTime(2200, now)
      master.gain.setValueAtTime(0.02, now)
      master.gain.exponentialRampToValueAtTime(0.001, now + 0.015)
      o.connect(master); o.start(now); o.stop(now + 0.02)
    },
    morph: () => {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.setValueAtTime(700, now)
      o.frequency.exponentialRampToValueAtTime(1100, now + 0.06)
      o.frequency.exponentialRampToValueAtTime(800, now + 0.1)
      master.gain.setValueAtTime(0.06, now)
      master.gain.exponentialRampToValueAtTime(0.001, now + 0.12)
      o.connect(master); o.start(now); o.stop(now + 0.14)
    },
    transition: () => {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.setValueAtTime(900, now)
      o.frequency.exponentialRampToValueAtTime(600, now + 0.08)
      master.gain.setValueAtTime(0.06, now)
      master.gain.exponentialRampToValueAtTime(0.001, now + 0.1)
      o.connect(master); o.start(now); o.stop(now + 0.12)
    },
    notify: () => {
      const freqs = [659.25, 880]
      freqs.forEach((f, i) => {
        const o = ctx.createOscillator()
        const g = ctx.createGain()
        o.type = 'sine'; o.frequency.value = f
        g.gain.setValueAtTime(0, now + i * 0.08)
        g.gain.linearRampToValueAtTime(0.06, now + i * 0.08 + 0.01)
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.12)
        o.connect(g); g.connect(ctx.destination)
        o.start(now + i * 0.08); o.stop(now + i * 0.08 + 0.13)
      })
    },
    release: () => {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.setValueAtTime(500, now)
      o.frequency.exponentialRampToValueAtTime(400, now + 0.03)
      master.gain.setValueAtTime(0.03, now)
      master.gain.exponentialRampToValueAtTime(0.001, now + 0.04)
      o.connect(master); o.start(now); o.stop(now + 0.05)
    },
    prepare: () => {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.setValueAtTime(400, now)
      o.frequency.exponentialRampToValueAtTime(600, now + 0.03)
      master.gain.setValueAtTime(0.03, now)
      master.gain.exponentialRampToValueAtTime(0.001, now + 0.04)
      o.connect(master); o.start(now); o.stop(now + 0.05)
    },
  }

  try { profiles[type]() } catch {}
}

// ── Settings ─────────────────────────────────────────────────────

let hapticsEnabled = true
let soundEnabled = true

export function setHapticsEnabled(v: boolean) { hapticsEnabled = v }
export function setSoundEnabled(v: boolean) { soundEnabled = v }
export function getHapticsEnabled() { return hapticsEnabled }
export function getSoundEnabled() { return soundEnabled }

if (typeof window !== 'undefined') {
  try {
    const hs = localStorage.getItem('minadent_haptics')
    const ss = localStorage.getItem('minadent_sound')
    if (hs !== null) hapticsEnabled = hs === 'true'
    if (ss !== null) soundEnabled = ss === 'true'
  } catch {}
}

// ── Core haptic / sound dispatch ─────────────────────────────────

export function haptic(pattern: HapticPattern = 'light') {
  if (!hapticsEnabled) return
  try { if ('vibrate' in navigator) navigator.vibrate(vibratePatterns[pattern]) } catch {}
}

export function playUISound(type: SoundType) {
  if (!soundEnabled) return
  playSound(type)
}

export function feedback(pattern: HapticPattern, sound?: SoundType) {
  haptic(pattern)
  if (sound) playUISound(sound)
  else if (pattern === 'success') playUISound('success')
  else if (pattern === 'error') playUISound('error')
  else if (pattern === 'warning') playUISound('error')
  else if (pattern === 'selection') playUISound('select')
  else if (pattern === 'transition') playUISound('transition')
  else if (pattern === 'morph') playUISound('morph')
  else if (pattern === 'prepare') playUISound('prepare')
  else if (pattern === 'release') playUISound('release')
  else if (pattern === 'notify') playUISound('notify')
  else if (pattern === 'peek') playUISound('tick')
}

// ── Continuous haptic for press-and-hold (iOS 27 "prepared" state) ──

let continuousInterval: ReturnType<typeof setInterval> | null = null

export function startContinuousHaptic(pattern: HapticPattern = 'soft', intervalMs = 80) {
  if (continuousInterval) return
  feedback('prepare', 'prepare')
  continuousInterval = setInterval(() => {
    haptic(pattern)
  }, intervalMs)
}

export function stopContinuousHaptic() {
  if (continuousInterval) {
    clearInterval(continuousInterval)
    continuousInterval = null
    feedback('release', 'release')
  }
}

// ── iOS 27 convenience presets ───────────────────────────────────

export const h = {
  tap:        () => feedback('light', 'tap'),
  select:     () => feedback('selection', 'select'),
  confirm:    () => feedback('medium', 'confirm'),
  success:    () => feedback('success', 'success'),
  error:      () => feedback('error', 'error'),
  warning:    () => feedback('warning', 'error'),
  delete:     () => feedback('heavy', 'delete'),
  swipe:      () => feedback('soft', 'swipe'),
  pop:        () => feedback('medium', 'pop'),
  toggle:     () => feedback('light', 'toggle'),
  cancel:     () => feedback('light', 'cancel'),
  heavy:      () => feedback('heavy'),
  medium:     () => feedback('medium'),
  light:      () => feedback('light'),
  // New iOS 27 patterns
  impact:     () => feedback('impact', 'pop'),
  notify:     () => feedback('notify', 'notify'),
  prepare:    () => feedback('prepare', 'prepare'),
  release:    () => feedback('release', 'release'),
  peek:       () => feedback('peek', 'tick'),
  morph:      () => feedback('morph', 'morph'),
  transition: () => feedback('transition', 'transition'),
  absorb:     () => feedback('absorb', 'pop'),
}
