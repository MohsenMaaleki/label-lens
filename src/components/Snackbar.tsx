import { useEffect, useSyncExternalStore } from 'react';
import { Animated, Pressable, StyleSheet, View, useAnimatedValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { announceOnIOS } from '../a11y';
import { isRTL } from '../i18n';
import { motion, useReducedMotion } from '../motion';
import { MAX_WIDTH, themed, useTheme } from '../theme';
import { T } from './ui';

interface Snack {
  id: number;
  text: string;
  lang: string;
  visible: boolean;
}

// One message at a time: a new one replaces the old.
let snack: Snack | null = null;
let nextId = 1;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function set(next: Snack | null) {
  snack = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * A short message at the bottom of the screen that goes away by itself (Material's "snackbar").
 * For results that need no answer; questions such as "Delete?" stay dialogs.
 */
export function showSnack(text: string, lang: string) {
  clearTimeout(timer);
  set({ id: nextId++, text, lang, visible: true });
  announceOnIOS(text);
  // Long enough to read: about 4 seconds for a few words, more for a sentence.
  timer = setTimeout(hideSnack, Math.min(10_000, 3_000 + text.length * 50));
}

export function hideSnack() {
  clearTimeout(timer);
  if (snack?.visible) set({ ...snack, visible: false });
}

/** Removes the message after it has faded out, unless a new one took its place. */
function clearSnack(id: number) {
  if (snack?.id === id && !snack.visible) set(null);
}

/** Render once, above the screens. */
export function SnackbarHost() {
  const { c, shadow } = useTheme();
  const s = useStyles();
  const current = useSyncExternalStore(subscribe, () => snack);
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const shown = useAnimatedValue(0);

  useEffect(() => {
    if (!current) return;
    const { id, visible } = current;
    if (reduced) {
      shown.setValue(visible ? 1 : 0);
      if (!visible) clearSnack(id);
      return;
    }
    const animation = Animated.timing(shown, {
      toValue: visible ? 1 : 0,
      duration: visible ? motion.base : 160,
      easing: motion.easeOut,
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished && !visible) clearSnack(id);
    });
    return () => animation.stop();
  }, [current, reduced, shown]);

  return (
    // Always mounted. Its label is the message: when the label of a live region changes, TalkBack reads it aloud.
    <View
      pointerEvents="box-none"
      accessible
      accessibilityLabel={current?.visible ? current.text : undefined}
      accessibilityLiveRegion="polite"
      style={[s.wrap, { bottom: insets.bottom + 16 }]}
    >
      {current ? (
        <Animated.View
          pointerEvents="box-none"
          style={{
            direction: isRTL(current.lang) ? 'rtl' : 'ltr',
            opacity: shown,
            transform: [{ translateY: shown.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
          }}
        >
          <Pressable onPress={hideSnack} style={[s.bar, shadow.float]}>
            <T v="small" color={c.onInverse} contentLang={current.lang}>
              {current.text}
            </T>
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

const useStyles = themed(({ c }) =>
  StyleSheet.create({
    // 20 dp sides, like the screen content, so the bar lines up with the cards above it.
    wrap: { position: 'absolute', left: 20, right: 20 },
    // As wide as the content column above it, also on a tablet.
    bar: { width: '100%', maxWidth: MAX_WIDTH - 40, alignSelf: 'center', minHeight: 48, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, backgroundColor: c.inverse },
  }),
);
