import { useEffect, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useAnimatedValue,
  type AccessibilityRole,
  type AccessibilityState,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
// The per-icon-set entry point: the package root would bundle all 19 icon fonts (4 MB).
import Feather from '@expo/vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLang } from '../lang';
import { isRTL } from '../i18n';
import { dateParts } from '../dates';
import { motion, useReducedMotion } from '../motion';
import { MAX_WIDTH, RADIUS, fontsFor, latin, themed, useTheme, type Fonts, type Tone } from '../theme';

export type IconName = ComponentProps<typeof Feather>['name'];

const mirrored: Partial<Record<IconName, IconName>> = {
  'arrow-left': 'arrow-right',
  'arrow-right': 'arrow-left',
  'chevron-left': 'chevron-right',
  'chevron-right': 'chevron-left',
};

/** Feather icon; arrows, chevrons and send point the other way in right-to-left languages. */
export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color?: string }) {
  const { rtl } = useLang();
  const { c } = useTheme();
  return (
    <Feather
      name={rtl ? (mirrored[name] ?? name) : name}
      size={size}
      color={color ?? c.ink}
      style={rtl && name === 'send' ? { transform: [{ scaleX: -1 }] } : undefined}
    />
  );
}

type Variant = 'display' | 'title' | 'h2' | 'body' | 'bodyBold' | 'small' | 'smallBold' | 'caption' | 'captionBold' | 'label';

const variants: Record<Variant, { size: number; line: number; font: keyof Fonts; tracking?: number }> = {
  display: { size: 30, line: 36, font: 'display', tracking: -0.6 },
  title: { size: 24, line: 30, font: 'display', tracking: -0.4 },
  h2: { size: 20, line: 26, font: 'display', tracking: -0.2 },
  body: { size: 16, line: 24, font: 'regular' },
  bodyBold: { size: 16, line: 24, font: 'bold' },
  small: { size: 14, line: 20, font: 'regular' },
  smallBold: { size: 14, line: 20, font: 'bold' },
  caption: { size: 13, line: 18, font: 'regular' },
  captionBold: { size: 13, line: 18, font: 'bold' },
  label: { size: 13, line: 18, font: 'bold' },
};

interface TProps extends TextProps {
  v?: Variant;
  color?: string;
  align?: TextStyle['textAlign'];
  /** Latin text copied from the letter (names, codes, amounts): Latin font, left-to-right. */
  latinText?: boolean;
  /** Text written in another language than the UI, e.g. a result explained in Persian. */
  contentLang?: string;
  children?: ReactNode;
}

/**
 * Android takes a paragraph's direction from its first strong letter, else from the screen.
 * So a Persian line starting with a Latin word would run left-to-right, and a code made only of
 * digits on a right-to-left screen would show its groups backwards ("3012 0260" as "0260 3012").
 * A leading RLM or LRM fixes the direction of the whole paragraph.
 */
export const RLM = '‏';
export const LRM = '‎';

/** Title variants are announced as headings, so TalkBack users can jump between sections. */
const headings = new Set<Variant>(['display', 'title', 'h2']);

export function T({ v = 'body', color, align, latinText, contentLang, style, children, ...rest }: TProps) {
  const ctx = useLang();
  const { c } = useTheme();
  const spec = variants[v];
  const rtl = latinText ? false : contentLang ? isRTL(contentLang) : ctx.rtl;
  const fonts = latinText ? latin : contentLang ? fontsFor(contentLang, ctx.arabicReady) : ctx.f;
  return (
    <Text
      accessibilityRole={headings.has(v) ? 'header' : undefined}
      {...rest}
      style={[
        // In a right-to-left layout React Native swaps text "left" and "right", so "left" always means
        // the side where lines start: left in English, right in Persian.
        { fontSize: spec.size, lineHeight: Math.round(spec.line * (rtl ? 1.3 : 1)), color: color ?? c.ink, textAlign: align ?? 'left' },
        fonts[spec.font],
        // Tight tracking for Latin headings only: negative spacing breaks joined Arabic-script letters.
        spec.tracking && !rtl ? { letterSpacing: spec.tracking } : null,
        style,
      ]}
    >
      {rtl ? RLM : ctx.rtl ? LRM : null}
      {children}
    </Text>
  );
}

/** Highlighter behind the words that matter. Use inside <T>. */
export function Marker({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  // Padding, not literal spaces: a space character here would show up next to whatever
  // punctuation follows (e.g. a space before "?"), and in scripts with no word spaces (Chinese).
  // Dark ink on the yellow in both themes: light text on yellow would be unreadable at night.
  return <Text style={{ backgroundColor: c.marker, color: c.onMarker, paddingHorizontal: 3 }}>{children}</Text>;
}

type Kind = 'primary' | 'secondary' | 'soft' | 'danger';

type KindStyle = { bg: string; fg: string; height: number; size: number };

// Every button is a pill. Black for the one main action, grey for the rest.
const useKinds = themed(
  ({ c }): Record<Kind, KindStyle> => ({
    primary: { bg: c.pill, fg: c.onPill, height: 56, size: 17 },
    secondary: { bg: c.mist, fg: c.ink, height: 52, size: 16 },
    soft: { bg: c.mist, fg: c.ink, height: 52, size: 16 },
    danger: { bg: c.redSoft, fg: c.redText, height: 52, size: 16 },
  }),
);

export function Button({
  title,
  onPress,
  icon,
  iconEnd,
  kind = 'primary',
  loading,
  disabled,
  style,
  children,
  accessibilityLabel,
  accessibilityRole = 'button',
  accessibilityState,
}: {
  title: string;
  onPress: () => void;
  icon?: IconName;
  iconEnd?: IconName;
  kind?: Kind;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  /** What a screen reader says; the title by default. */
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
}) {
  const { f } = useLang();
  const k = useKinds()[kind];
  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!(disabled || loading), ...accessibilityState }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          flexWrap: 'wrap',
          // With wrap on, the lines sit at the top of a button taller than its content unless centered too.
          alignContent: 'center',
          alignItems: 'center',
          justifyContent: 'center',
          columnGap: 10,
          rowGap: 4,
          minHeight: k.height,
          paddingHorizontal: 20,
          paddingVertical: 8,
          borderRadius: 999,
          backgroundColor: k.bg,
        },
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={k.fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={k.size + 3} color={k.fg} /> : null}
          {/* No line limit: with a large system font, a label wraps instead of being cut off. */}
          <Text style={[{ color: k.fg, fontSize: k.size, flexShrink: 1, textAlign: 'center' }, f.extra]}>{title}</Text>
          {children}
          {iconEnd ? <Icon name={iconEnd} size={k.size + 3} color={k.fg} /> : null}
        </>
      )}
    </Pressable>
  );
}

/** A round 48 dp icon button, white on the page like the header buttons of the design. */
export function IconButton({
  icon,
  label,
  onPress,
  color,
  bg,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  color?: string;
  bg?: string;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: bg ?? c.card },
        pressed && { opacity: 0.6 },
      ]}
    >
      <Icon name={icon} size={21} color={color ?? c.ink} />
    </Pressable>
  );
}

/** A thin-line icon in a round white badge, as on the tiles. */
export function IconCircle({ icon, size = 48, bg, color }: { icon: IconName; size?: number; bg?: string; color?: string }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: bg ?? c.circle,
      }}
    >
      <Icon name={icon} size={Math.round(size * 0.46)} color={color ?? c.onCircle} />
    </View>
  );
}

/** A soft rounded block. White by default; pass `fill` for a pastel one. */
export function Card({ children, fill, style }: { children: ReactNode; fill?: string; style?: StyleProp<ViewStyle> }) {
  const s = useStyles();
  return <View style={[s.card, fill ? { backgroundColor: fill } : null, style]}>{children}</View>;
}

export function Chip({ text, tone = 'neutral', icon }: { text: string; tone?: Tone; icon?: IconName }) {
  const { tones } = useTheme();
  const s = useStyles();
  const col = tones[tone];
  return (
    <View style={[s.chip, { backgroundColor: col.bg }]}>
      {icon ? <Feather name={icon} size={14} color={col.fg} /> : null}
      <T v="captionBold" color={col.fg} numberOfLines={1}>
        {text}
      </T>
    </View>
  );
}

/** Small lavender badge for Pro features. */
export function ProBadge() {
  const { c } = useTheme();
  const s = useStyles();
  return (
    <View style={s.proBadge} accessible accessibilityLabel="Pro">
      <Text style={[latin.extra, { color: c.ink, fontSize: 11, lineHeight: 14, letterSpacing: 1 }]}>PRO</Text>
    </View>
  );
}

/** The lavender "Go Pro" pill. */
export function ProButton({ title, onPress }: { title: string; onPress: () => void }) {
  const s = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [s.proButton, pressed && { opacity: 0.75 }]}
    >
      <T v="smallBold" align="center">
        {title}
      </T>
    </Pressable>
  );
}

export function SectionTitle({ icon, title, color, right }: { icon: IconName; title: string; color?: string; right?: ReactNode }) {
  const { c } = useTheme();
  const s = useStyles();
  return (
    <View style={s.sectionTitle}>
      <Feather name={icon} size={20} color={color ?? c.ink} />
      <T v="h2" style={{ flex: 1 }}>
        {title}
      </T>
      {right}
    </View>
  );
}

/** Month, day and weekday of an ISO date, tinted by how soon it is. */
export function DateTile({ iso, tone, large }: { iso: string; tone: Tone; large?: boolean }) {
  const { lang, f } = useLang();
  const { tones } = useTheme();
  const s = useStyles();
  const d = dateParts(iso, lang);
  const col = tones[tone];
  return (
    <View
      style={[
        s.tile,
        // minWidth, not width: the tile grows with the system font size instead of clipping the day.
        { backgroundColor: col.bg, minWidth: large ? 80 : 66, borderRadius: large ? 22 : 18, paddingVertical: large ? 12 : 9 },
      ]}
    >
      <T v="captionBold" color={col.fg} align="center" numberOfLines={1}>
        {d.year ? `${d.month} ${d.year}` : d.month}
      </T>
      {/* Not latin.display: Persian/Arabic digits need Vazirmatn's own digit glyphs, not the Latin font's. */}
      <Text style={[f.display, { fontSize: large ? 34 : 28, lineHeight: large ? 38 : 32, color: col.fg }]}>{d.day}</Text>
      <T v="captionBold" color={col.fg} align="center" numberOfLines={1}>
        {d.weekday}
      </T>
    </View>
  );
}

/** Bottom sheet over a dimmed screen. */
export function Sheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  const { rtl, t } = useLang();
  const { c, shadow } = useTheme();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const rise = useAnimatedValue(0);
  useEffect(() => {
    if (!visible) return;
    if (reduced) {
      rise.setValue(1);
      return;
    }
    rise.setValue(0);
    Animated.timing(rise, { toValue: 1, duration: motion.base, easing: motion.easeOut, useNativeDriver: true }).start();
  }, [visible, reduced, rise]);
  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduced ? 'none' : 'fade'}
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={{ flex: 1, direction: rtl ? 'rtl' : 'ltr' }}>
        <Pressable accessibilityRole="button" accessibilityLabel={t.close} onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }]} />
        <Animated.View
          style={[
            s.sheet,
            shadow.sheet,
            { paddingBottom: insets.bottom + 8 },
            { opacity: rise, transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }] },
          ]}
        >
          <View style={s.grabber} />
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

/** Fades and lifts its content in once, after `delay` ms. With reduced motion it is simply there. */
export function FadeIn({ delay = 0, children, style }: { delay?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const a = useAnimatedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) {
      a.setValue(1);
      return;
    }
    Animated.timing(a, { toValue: 1, duration: motion.base, delay, easing: motion.easeOut, useNativeDriver: true }).start();
  }, [a, delay, reduced]);
  return (
    <Animated.View style={[style, { opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/** A letter with a highlighted line, under a lens: the app icon's mark (assets/icon/). Never mirrored. */
export function LogoMark({ size = 34 }: { size?: number }) {
  const { c } = useTheme();
  const k = size / 34;
  const box = (left: number, top: number, width: number, height: number, style: ViewStyle) => ({
    position: 'absolute' as const,
    left: left * k,
    top: top * k,
    width: width * k,
    height: height * k,
    ...style,
  });
  return (
    <View style={{ width: size, height: size }} importantForAccessibility="no-hide-descendants">
      <View style={box(3, 2, 21, 27, { borderRadius: 5 * k, backgroundColor: c.pill })} />
      <View style={box(7, 8, 11, 3.5, { borderRadius: 1.75 * k, backgroundColor: c.marker })} />
      <View style={box(7, 14.5, 13, 2, { borderRadius: k, backgroundColor: c.onPill })} />
      <View style={box(7, 19.5, 9, 2, { borderRadius: k, backgroundColor: c.onPill })} />
      {/* Clear space around the lens, so the lens reads on top of the letter in the same color. */}
      <View style={box(14.6, 13.6, 16.8, 16.8, { borderRadius: 8.4 * k, backgroundColor: c.bg })} />
      <View style={box(16, 15, 14, 14, { borderRadius: 7 * k, borderWidth: 2.5 * k, borderColor: c.pill, backgroundColor: c.bg })} />
      <View style={box(26.5, 27.5, 7, 3, { borderRadius: 1.5 * k, backgroundColor: c.pill, transform: [{ rotate: '45deg' }] })} />
    </View>
  );
}

const useStyles = themed(({ c }) =>
  StyleSheet.create({
    card: { backgroundColor: c.card, borderRadius: RADIUS.card, padding: 20, gap: 8 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 999,
      maxWidth: '100%',
    },
    proBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: c.lavender },
    proButton: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 18, borderRadius: 999, backgroundColor: c.lavender },
    sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
    tile: { alignItems: 'center', paddingHorizontal: 8 },
    sheet: {
      marginTop: 'auto',
      width: '100%',
      maxWidth: MAX_WIDTH,
      alignSelf: 'center',
      maxHeight: '90%',
      backgroundColor: c.card,
      borderTopLeftRadius: RADIUS.tile,
      borderTopRightRadius: RADIUS.tile,
    },
    grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: c.lineStrong, marginTop: 10 },
  }),
);
