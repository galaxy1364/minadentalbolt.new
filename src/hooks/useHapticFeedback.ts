import { useCallback } from 'react';
import { triggerHaptic, HapticType } from '../utils/haptics';

export type ImpactStyle = 'light' | 'medium' | 'heavy';
export type NotificationFeedbackType = 'success' | 'warning' | 'error';

export interface UseHapticFeedbackReturn {
  selection: () => void;
  impactLight: () => void;
  impactMedium: () => void;
  impactHeavy: () => void;
  impact: (style?: ImpactStyle) => void;
  notification: (type: NotificationFeedbackType) => void;
  success: () => void;
  warning: () => void;
  error: () => void;
  trigger: (type: HapticType) => void;
  withHaptic: <T extends (...args: any[]) => any>(
    fn?: T,
    type?: HapticType
  ) => (...args: Parameters<T>) => ReturnType<T> | void;
}

/**
 * Centralized iOS 27 Haptic Feedback Hook
 * Utilizes navigator.vibrate with millisecond patterns calibrated to authentic iOS Taptic Engine
 * coupled with Web Audio micro-pulse synthesis fallback for iOS Safari WebKit.
 */
export function useHapticFeedback(): UseHapticFeedbackReturn {
  // 1. Selection change (10-12ms micro-tick for pickers, tabs, toggles)
  const selection = useCallback(() => {
    triggerHaptic('selection');
  }, []);

  // 2. Impact Light (12-15ms soft collision for buttons, cards, list items)
  const impactLight = useCallback(() => {
    triggerHaptic('light');
  }, []);

  // 3. Impact Medium (20-24ms distinct bump for confirmations, modals, toolbars)
  const impactMedium = useCallback(() => {
    triggerHaptic('medium');
  }, []);

  // 4. Impact Heavy (35-40ms solid sensory thud for primary submissions, destructive actions)
  const impactHeavy = useCallback(() => {
    triggerHaptic('heavy');
  }, []);

  // Generic impact handler
  const impact = useCallback((style: ImpactStyle = 'light') => {
    if (style === 'heavy') triggerHaptic('heavy');
    else if (style === 'medium') triggerHaptic('medium');
    else triggerHaptic('light');
  }, []);

  // Success pattern (double pulse)
  const success = useCallback(() => {
    triggerHaptic('success');
  }, []);

  // Warning pattern
  const warning = useCallback(() => {
    triggerHaptic('warning');
  }, []);

  // Error pattern
  const error = useCallback(() => {
    triggerHaptic('error');
  }, []);

  // Notification feedback
  const notification = useCallback((type: NotificationFeedbackType) => {
    triggerHaptic(type);
  }, []);

  // Direct trigger
  const trigger = useCallback((type: HapticType) => {
    triggerHaptic(type);
  }, []);

  // Higher-order function to wrap any click or event handler with instant haptic feedback
  const withHaptic = useCallback(
    <T extends (...args: any[]) => any>(
      fn?: T,
      type: HapticType = 'light'
    ) => {
      return (...args: Parameters<T>): ReturnType<T> | void => {
        triggerHaptic(type);
        if (fn) {
          return fn(...args);
        }
      };
    },
    []
  );

  return {
    selection,
    impactLight,
    impactMedium,
    impactHeavy,
    impact,
    notification,
    success,
    warning,
    error,
    trigger,
    withHaptic
  };
}
