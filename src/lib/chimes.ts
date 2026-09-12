// src/lib/chimes.ts — Audio synthesizer for clinical chimes and haptic feedback
// Built purely with Web Audio API; zero external audio files or network requests.

class ClinicSoundSynth {
  private ctx: AudioContext | null = null

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
    return this.ctx
  }

  /**
   * Subtle high-class iOS chime for success (appointment booked, payment recorded, etc.)
   */
  playSuccess(): void {
    const ctx = this.getContext()
    if (!ctx) return

    const now = ctx.currentTime
    // Dual harmonious bell tones (E6 and G#6)
    this.playTone(ctx, 1318.51, now, 0.28, 0.08)
    this.playTone(ctx, 1661.22, now + 0.09, 0.35, 0.06)
  }

  /**
   * Gentle dual-chime for urgent alarms (clinical follow-up, overdue lab, bounced cheque)
   */
  playAlarm(): void {
    const ctx = this.getContext()
    if (!ctx) return

    const now = ctx.currentTime
    // Distinct soft medical chime (A5 then E6)
    this.playTone(ctx, 880, now, 0.22, 0.1)
    this.playTone(ctx, 1318.51, now + 0.12, 0.4, 0.09)
  }

  /**
   * Soft warning tone (conflict, allergy warning)
   */
  playWarning(): void {
    const ctx = this.getContext()
    if (!ctx) return

    const now = ctx.currentTime
    this.playTone(ctx, 587.33, now, 0.18, 0.1) // D5
    this.playTone(ctx, 523.25, now + 0.08, 0.25, 0.08) // C5
  }

  /**
   * Micro pop for rapid button actions / tab switches
   */
  playPop(): void {
    const ctx = this.getContext()
    if (!ctx) return

    const now = ctx.currentTime
    this.playTone(ctx, 987.77, now, 0.08, 0.04) // B5 quick click
  }

  private playTone(
    ctx: AudioContext,
    freq: number,
    startTime: number,
    duration: number,
    maxGain: number
  ): void {
    try {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, startTime)

      gain.gain.setValueAtTime(0.0001, startTime)
      // Rapid attack
      gain.gain.exponentialRampToValueAtTime(maxGain, startTime + 0.015)
      // Smooth exponential decay
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(startTime)
      osc.stop(startTime + duration + 0.02)
    } catch {
      // Audio autoplay policy or browser restriction handling
    }
  }
}

export const chimes = new ClinicSoundSynth()
