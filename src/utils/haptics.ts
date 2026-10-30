/**
 * iOS 27 Next-Gen Tactile & Haptic Engine
 * Provides authentic iOS tactile sensory feedback via Web Vibration API
 * with instant fallback to micro-audio impulse synthesizer for devices without vibration motor.
 */

export type HapticType = 
  | 'light' 
  | 'medium' 
  | 'heavy' 
  | 'selection' 
  | 'success' 
  | 'warning' 
  | 'error' 
  | 'gesture' 
  | 'spring';

// Audio Context for synthetic tactile feedback on iOS Safari
let audioCtx: AudioContext | null = null;
let acousticFeedbackEnabled = true;

export function setAcousticFeedbackEnabled(enabled: boolean): void {
  acousticFeedbackEnabled = enabled;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('minadental_acoustic_feedback', enabled ? 'true' : 'false');
    } catch {}
  }
}

export function getAcousticFeedbackEnabled(): boolean {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('minadental_acoustic_feedback');
      if (stored !== null) return stored === 'true';
    } catch {}
  }
  return acousticFeedbackEnabled;
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

function playSynthesizedHapticTick(frequency = 180, duration = 0.015, gainVal = 0.08) {
  if (!getAcousticFeedbackEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(gainVal, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Ignore audio context errors silently
  }
}

/**
 * Triggers genuine iOS-grade haptic response
 */
export function triggerHaptic(type: HapticType = 'light'): void {
  if (typeof window === 'undefined') return;

  const hasVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  try {
    switch (type) {
      case 'light':
      case 'selection':
        if (hasVibrate) navigator.vibrate(12);
        playSynthesizedHapticTick(240, 0.01, 0.04);
        break;

      case 'medium':
      case 'gesture':
        if (hasVibrate) navigator.vibrate(22);
        playSynthesizedHapticTick(200, 0.018, 0.07);
        break;

      case 'heavy':
        if (hasVibrate) navigator.vibrate(36);
        playSynthesizedHapticTick(140, 0.025, 0.12);
        break;

      case 'spring':
        if (hasVibrate) navigator.vibrate([10, 30, 16]);
        playSynthesizedHapticTick(280, 0.012, 0.06);
        setTimeout(() => playSynthesizedHapticTick(340, 0.015, 0.08), 35);
        break;

      case 'success':
        // iOS signature double-tap success pulse
        if (hasVibrate) navigator.vibrate([16, 40, 24]);
        playSynthesizedHapticTick(300, 0.015, 0.08);
        setTimeout(() => playSynthesizedHapticTick(420, 0.02, 0.1), 45);
        break;

      case 'warning':
        if (hasVibrate) navigator.vibrate([25, 50, 30]);
        playSynthesizedHapticTick(180, 0.03, 0.1);
        break;

      case 'error':
        // iOS triple-buzz error cadence
        if (hasVibrate) navigator.vibrate([40, 60, 40, 60, 50]);
        playSynthesizedHapticTick(120, 0.03, 0.12);
        setTimeout(() => playSynthesizedHapticTick(100, 0.03, 0.12), 70);
        break;
    }
  } catch {
    // Graceful no-op
  }
}
