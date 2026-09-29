import { useSyncExternalStore } from 'react';
import { AccessibilityInfo, Easing } from 'react-native';

/**
 * Android "Remove animations" (iOS: Reduce Motion). React Native's Animated does not follow the
 * system switch, so every animated component checks it and shows the end state instead.
 */
let reduced = false;
const listeners = new Set<() => void>();

function update(value: boolean) {
  reduced = value;
  listeners.forEach((listener) => listener());
}

AccessibilityInfo.isReduceMotionEnabled().then(update, () => {});
AccessibilityInfo.addEventListener('reduceMotionChanged', update);

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useReducedMotion() {
  return useSyncExternalStore(subscribe, () => reduced);
}

/** App timings: state changes in about a quarter second, decelerating (ease-out-quart). */
export const motion = {
  easeOut: Easing.bezier(0.25, 1, 0.5, 1),
  base: 240,
};
