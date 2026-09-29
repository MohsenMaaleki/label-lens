import { useSyncExternalStore } from 'react';
import { loadAsync } from 'expo-font';
import { Vazirmatn_400Regular } from '@expo-google-fonts/vazirmatn/400Regular';
import { Vazirmatn_700Bold } from '@expo-google-fonts/vazirmatn/700Bold';
import { Vazirmatn_800ExtraBold } from '@expo-google-fonts/vazirmatn/800ExtraBold';

/**
 * Vazirmatn draws Persian, Arabic and Urdu. It loads only when that script is on screen, so people
 * who read other scripts never load its three files. Until it is ready, that text uses the system font.
 */
export type ArabicFontState = 'idle' | 'loading' | 'ready' | 'failed';

let state: ArabicFontState = 'idle';
const listeners = new Set<() => void>();

function set(next: ArabicFontState) {
  state = next;
  listeners.forEach((listener) => listener());
}

export function loadArabicFonts() {
  if (state !== 'idle') return;
  set('loading');
  loadAsync({ Vazirmatn_400Regular, Vazirmatn_700Bold, Vazirmatn_800ExtraBold }).then(
    () => set('ready'),
    () => set('failed'),
  );
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useArabicFonts(): ArabicFontState {
  return useSyncExternalStore(subscribe, () => state);
}
