import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  View,
  useAnimatedValue,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { announceOnIOS } from '../a11y';
import { useLang } from '../lang';
import { useReducedMotion } from '../motion';
import { T } from '../components/ui';
import { themed, useTheme } from '../theme';

/** Where the highlighter strokes appear on the photo, as fractions of its size. */
const STROKES = [
  { top: 0.36, start: 0.12, width: 0.62 },
  { top: 0.5, start: 0.12, width: 0.44 },
  { top: 0.64, start: 0.12, width: 0.56 },
];

/** With reduced motion the bar moves in steps with the stage instead of filling smoothly. */
const STAGE_PROGRESS = [0.25, 0.6, 0.85];

export default function ScanningScreen({ imageUri, onCancel }: { imageUri: string; onCancel: () => void }) {
  const { t, rtl } = useLang();
  const { c } = useTheme();
  const s = useStyles();
  const reduced = useReducedMotion();
  const [stage, setStage] = useState(0);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const sweep = useAnimatedValue(0);
  const lens = useAnimatedValue(0);
  const progress = useAnimatedValue(0);
  const stroke0 = useAnimatedValue(0);
  const stroke1 = useAnimatedValue(0);
  const stroke2 = useAnimatedValue(0);
  const strokes = useMemo(() => [stroke0, stroke1, stroke2], [stroke0, stroke1, stroke2]);

  useEffect(() => {
    const timers = [setTimeout(() => setStage(1), 2500), setTimeout(() => setStage(2), 7000)];
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (reduced) progress.setValue(STAGE_PROGRESS[stage]);
  }, [reduced, stage, progress]);

  // Android reads the step list aloud as a live region (below); iOS needs an announcement.
  useEffect(() => {
    announceOnIOS([t.stepRead, t.stepExplain, t.stepFind][stage]);
  }, [stage, t]);

  useEffect(() => {
    if (reduced) {
      // "Remove animations": the lines stay highlighted and the lens stays still.
      strokes.forEach((v) => v.setValue(1));
      lens.setValue(0.5);
      return;
    }
    const ease = Easing.inOut(Easing.quad);
    const loops = [
      Animated.loop(
        Animated.sequence([
          Animated.timing(sweep, { toValue: 1, duration: 1800, easing: ease, useNativeDriver: true }),
          Animated.timing(sweep, { toValue: 0, duration: 1800, easing: ease, useNativeDriver: true }),
        ]),
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(lens, { toValue: 1, duration: 2600, easing: ease, useNativeDriver: true }),
          Animated.timing(lens, { toValue: 0, duration: 2600, easing: ease, useNativeDriver: true }),
        ]),
      ),
      Animated.loop(
        Animated.sequence([
          Animated.stagger(
            450,
            strokes.map((v) => Animated.timing(v, { toValue: 1, duration: 450, easing: Easing.out(Easing.quad), useNativeDriver: true })),
          ),
          Animated.delay(900),
          Animated.parallel(strokes.map((v) => Animated.timing(v, { toValue: 0, duration: 350, useNativeDriver: true }))),
        ]),
      ),
    ];
    loops.forEach((l) => l.start());
    // Slows down as it goes: most scans finish in 5 to 15 seconds.
    const fill = Animated.timing(progress, { toValue: 0.94, duration: 20000, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    fill.start();
    return () => {
      loops.forEach((l) => l.stop());
      fill.stop();
    };
  }, [reduced, sweep, lens, progress, strokes]);

  const steps = [t.stepRead, t.stepExplain, t.stepFind];
  const origin = rtl ? 'right' : 'left';

  return (
    <View style={{ flex: 1 }}>
      <View style={s.header}>
        <Pressable accessibilityRole="button" onPress={onCancel} style={s.cancel}>
          <T v="bodyBold">
            {t.cancel}
          </T>
        </Pressable>
      </View>

      <View style={s.photo} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        <Image source={{ uri: imageUri }} resizeMode="contain" style={StyleSheet.absoluteFill} />
        {box.h > 0 ? (
          <>
            {STROKES.map((st, i) => (
              <Animated.View
                key={i}
                style={[
                  s.stroke,
                  {
                    top: st.top * box.h,
                    start: st.start * box.w,
                    width: st.width * box.w,
                    opacity: strokes[i],
                    transformOrigin: origin,
                    transform: [{ scaleX: strokes[i] }],
                  },
                ]}
              />
            ))}
            {reduced ? null : (
              <Animated.View
                style={[
                  s.sweep,
                  { transform: [{ translateY: sweep.interpolate({ inputRange: [0, 1], outputRange: [0, box.h - 72] }) }] },
                ]}
              >
                <View style={s.sweepLine} />
              </Animated.View>
            )}
            <Animated.View
              style={[
                s.lens,
                {
                  left: box.w / 2 - 52,
                  top: box.h * 0.42 - 52,
                  transform: [
                    { translateX: lens.interpolate({ inputRange: [0, 1], outputRange: [-34, 34] }) },
                    { translateY: lens.interpolate({ inputRange: [0, 1], outputRange: [-18, 22] }) },
                  ],
                },
              ]}
            />
          </>
        ) : null}
      </View>

      <View style={s.body}>
        <T v="title">{t.reading}</T>
        {/* One node for screen readers, labeled with the current step. As a live region, TalkBack reads each new step. */}
        <View style={{ gap: 10 }} accessible accessibilityLabel={steps[stage]} accessibilityLiveRegion="polite">
          {steps.map((label, i) => {
            const state = i < stage ? 'done' : i === stage ? 'active' : 'todo';
            return (
              <View key={label} style={s.step}>
                <View style={s.stepIcon}>
                  {state === 'done' ? (
                    <View style={s.done}>
                      <Feather name="check" size={15} color={c.ink} />
                    </View>
                  ) : state === 'active' ? (
                    <ActivityIndicator color={c.ink} />
                  ) : (
                    <View style={s.todo} />
                  )}
                </View>
                <T
                  v={state === 'active' ? 'bodyBold' : 'body'}
                  color={state === 'todo' ? c.sub : state === 'done' ? c.ink2 : c.ink}
                  style={{ flex: 1 }}
                >
                  {label}
                </T>
                {state === 'done' ? (
                  <T v="captionBold" color={c.ink2}>
                    {t.done}
                  </T>
                ) : null}
              </View>
            );
          })}
        </View>
        <View style={s.track}>
          <Animated.View style={[s.fill, { transformOrigin: origin, transform: [{ scaleX: progress }] }]} />
        </View>
        <View style={s.privacy}>
          <Feather name="lock" size={13} color={c.sub} />
          <T v="caption" color={c.sub} align="center">
            {t.photoPrivacy}
          </T>
        </View>
      </View>
    </View>
  );
}

const useStyles = themed(({ c, shadow }) =>
  StyleSheet.create({
    header: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 4 },
    cancel: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 8 },
    photo: {
      flex: 1,
      minHeight: 240,
      maxHeight: 440,
      marginHorizontal: 20,
      marginTop: 6,
      borderRadius: 28,
      backgroundColor: c.frame,
      overflow: 'hidden',
    },
    stroke: { position: 'absolute', height: 14, borderRadius: 4, backgroundColor: c.markerWash },
    sweep: { position: 'absolute', left: 0, right: 0, top: 0, height: 72, backgroundColor: c.lavenderWash },
    sweepLine: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, backgroundColor: c.ink },
    lens: {
      position: 'absolute',
      width: 104,
      height: 104,
      borderRadius: 52,
      borderWidth: 6,
      borderColor: c.onDark,
      ...shadow.lens,
    },
    body: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, gap: 14 },
    step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    stepIcon: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
    done: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: c.green },
    todo: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderStyle: 'dashed', borderColor: c.inkFaint },
    track: { height: 8, borderRadius: 4, backgroundColor: c.mist, overflow: 'hidden' },
    fill: { height: 8, borderRadius: 4, backgroundColor: c.ink },
    privacy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  }),
);
