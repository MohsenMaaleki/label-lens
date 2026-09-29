import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { FREE_SCANS_PER_WEEK, LANGUAGES } from '../config';
import { useLang } from '../lang';
import { dueTone, nextDeadline } from '../dates';
import { DateTile, Icon, IconButton, IconCircle, LogoMark, Marker, ProButton, T, type IconName } from '../components/ui';
import { ScanRow } from '../components/ScanRow';
import { RADIUS, themed, useTheme } from '../theme';
import type { ScanSource } from '../scan';
import type { Scan } from '../types';

interface Props {
  scans: Scan[];
  pro: boolean;
  used: number;
  onScan: (source: ScanSource) => void;
  onOpen: (scan: Scan) => void;
  onLanguage: () => void;
  onSettings: () => void;
  onHistory: () => void;
  onGoPro: () => void;
  /** Tablets: the letter open in the right pane. */
  selectedId?: string;
}

export default function HomeScreen(p: Props) {
  const { t, lang } = useLang();
  const { c } = useTheme();
  const s = useStyles();
  const next = nextDeadline(p.scans);
  const left = Math.max(0, FREE_SCANS_PER_WEEK - p.used);
  const native = LANGUAGES.find((l) => l.code === lang)?.native ?? 'English';

  return (
    <ScrollView contentContainerStyle={s.content}>
      <View style={s.header}>
        <LogoMark />
        <T v="h2" latinText style={{ flex: 1, fontSize: 22 }}>
          Label Lens
        </T>
        <IconButton icon="globe" label={`${t.chooseLanguage}: ${native}`} onPress={p.onLanguage} />
        <IconButton icon="sliders" label={t.settings} onPress={p.onSettings} />
      </View>

      <View style={{ gap: 8 }}>
        <T v="display">
          {t.homeTitle[0]}
          <Marker>{t.homeTitle[1]}</Marker>
          {t.homeTitle[2]}
        </T>
        <T color={c.ink2}>{t.homeSub}</T>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t.chooseLanguage}: ${native}`}
          onPress={p.onLanguage}
          style={({ pressed }) => [s.langChip, pressed && { opacity: 0.7 }]}
        >
          <T v="smallBold" color={c.ink2}>{`🌐 ${native} · ${t.change}`}</T>
        </Pressable>
      </View>

      <View style={{ gap: 12 }}>
        <View style={s.grid}>
          <Tile icon="camera" title={t.scanTile} sub={t.scanTileSub} fill={c.mist} onPress={() => p.onScan('camera')} />
          <Tile icon="image" title={t.photosTile} sub={t.photosTileSub} fill={c.yellow} onPress={() => p.onScan('library')} />
          <Tile icon="file-text" title={t.trySample} sub={t.sampleTileSub} fill={c.green} onPress={() => p.onScan('sample')} />
          <Tile icon="folder" title={t.myDocuments} sub={t.docsTileSub} fill={c.orange} onPress={p.onHistory} />
        </View>

        <View style={s.meta}>
          {p.pro ? (
            <View style={s.metaRow}>
              <Feather name="check-circle" size={15} color={c.sub} />
              <T v="small" color={c.sub} style={{ flex: 1 }}>
                {t.proUnlimited}
              </T>
            </View>
          ) : (
            <View style={s.metaRow}>
              <T v="small" color={c.sub} style={{ flex: 1 }}>
                {t.freeLeft(left, FREE_SCANS_PER_WEEK)}
              </T>
              <ProButton title={t.goPro} onPress={p.onGoPro} />
            </View>
          )}
          <View style={s.metaRow}>
            <Feather name="lock" size={13} color={c.sub} />
            <T v="caption" color={c.sub} style={{ flex: 1 }}>
              {t.photoPrivacy}
            </T>
          </View>
        </View>
      </View>

      {next ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => p.onOpen(next.scan)}
          style={({ pressed }) => [s.deadline, pressed && { opacity: 0.85 }]}
        >
          <DateTile iso={next.deadline.date} tone={dueTone(next.days)} />
          <View style={{ flex: 1, gap: 3, justifyContent: 'center' }}>
            <T v="label" color={c.sub}>
              {t.nextDeadline}
            </T>
            <T v="bodyBold" contentLang={next.scan.language} numberOfLines={2}>
              {next.deadline.what}
            </T>
            <T v="small" color={c.ink2}>
              {t.inDays(next.days)}
            </T>
          </View>
          <Icon name="chevron-right" size={22} color={c.sub} />
        </Pressable>
      ) : null}

      {p.scans.length > 0 ? (
        <View style={{ gap: 10 }}>
          <View style={s.rowBetween}>
            <T v="h2">{t.recent}</T>
            <Pressable accessibilityRole="button" onPress={p.onHistory} style={s.link}>
              <T v="smallBold">{t.seeAll}</T>
            </Pressable>
          </View>
          {p.scans.slice(0, 3).map((scan) => (
            <ScanRow key={scan.id} scan={scan} onPress={() => p.onOpen(scan)} selected={scan.id === p.selectedId} />
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

/** A big pastel tile: a line icon in a white circle, a bold title and one short line under it. */
function Tile({ icon, title, sub, fill, onPress }: { icon: IconName; title: string; sub: string; fill: string; onPress: () => void }) {
  const { c } = useTheme();
  const s = useStyles();
  const { fontScale } = useWindowDimensions();
  // With large system text a half-width tile breaks words ("My docu-ments"): use full-width rows instead.
  const wide = fontScale >= 1.3;
  const align = wide ? 'left' : 'center';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${sub}`}
      onPress={onPress}
      style={({ pressed }) => [
        s.tile,
        wide && s.tileWide,
        { backgroundColor: fill },
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
      ]}
    >
      <IconCircle icon={icon} size={52} />
      <View style={wide ? s.tileTextWide : s.tileText}>
        <T v="h2" align={align}>
          {title}
        </T>
        <T v="caption" color={c.ink2} align={align}>
          {sub}
        </T>
      </View>
    </Pressable>
  );
}

const useStyles = themed(({ c }) =>
  StyleSheet.create({
    content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32, gap: 22 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    langChip: {
      alignSelf: 'flex-start',
      minHeight: 40,
      justifyContent: 'center',
      paddingHorizontal: 14,
      borderRadius: 999,
      backgroundColor: c.mist,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    tile: {
      flexBasis: '46%',
      flexGrow: 1,
      minHeight: 176,
      alignItems: 'center',
      // Top, not center: when one subtitle wraps (Persian, French), the icons and titles in a row still line up.
      justifyContent: 'flex-start',
      gap: 8,
      paddingHorizontal: 14,
      paddingTop: 28,
      paddingBottom: 20,
      borderRadius: RADIUS.tile,
    },
    // Full width and centered with textAlign, not shrunk to the text: Android sometimes draws a shrunk
    // text a fraction wider than it measured it, and the last word then wraps onto a hidden line.
    tileText: { alignSelf: 'stretch', gap: 8 },
    tileWide: { flexBasis: '100%', flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 0, paddingVertical: 20, paddingHorizontal: 20 },
    tileTextWide: { flex: 1, gap: 4 },
    meta: { gap: 6, paddingHorizontal: 4 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    deadline: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      padding: 14,
      borderRadius: RADIUS.card,
      backgroundColor: c.card,
    },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    link: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 4 },
  }),
);
