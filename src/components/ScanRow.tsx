import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useLang } from '../lang';
import { daysUntil, dueTone, isIsoDate, upcomingDeadlines } from '../dates';
import { RADIUS, docIcon, themed, useTheme } from '../theme';
import type { Tone } from '../theme';
import type { Scan } from '../types';
import { Chip, IconCircle, T } from './ui';

/** `selected`: the letter open next to the list, on a tablet. */
export function ScanRow({ scan, onPress, selected }: { scan: Scan; onPress: () => void; selected?: boolean }) {
  const { t } = useLang();
  const { c } = useTheme();
  const s = useStyles();
  const { fontScale } = useWindowDimensions();
  // With large system text the chip goes under the title, so the title keeps the full width.
  const stacked = fontScale >= 1.3;
  const [next] = upcomingDeadlines(scan);
  const hadDates = scan.result.deadlines.some((d) => isIsoDate(d.date));
  let chip: { text: string; tone: Tone } = { text: t.noDeadline, tone: 'neutral' };
  if (next) {
    const days = daysUntil(next.date);
    chip = { text: t.daysLeft(days), tone: dueTone(days) };
  } else if (hadDates) {
    chip = { text: t.past, tone: 'neutral' };
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={({ pressed }) => [s.row, selected && s.selected, pressed && { opacity: 0.85 }]}
    >
      <IconCircle icon={docIcon[scan.result.doc_type] ?? docIcon.other} size={44} bg={c.mist} />
      <View style={{ flex: 1, gap: 2 }}>
        <T v="bodyBold" contentLang={scan.language} numberOfLines={stacked ? 2 : 1}>
          {scan.result.title}
        </T>
        {scan.result.issuer ? (
          <T v="caption" color={c.sub} latinText numberOfLines={1}>
            {scan.result.issuer}
          </T>
        ) : null}
        {stacked ? <Chip text={chip.text} tone={chip.tone} /> : null}
      </View>
      {stacked ? null : <Chip text={chip.text} tone={chip.tone} />}
    </Pressable>
  );
}

const useStyles = themed(({ c }) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: RADIUS.row,
      backgroundColor: c.card,
      // A clear border keeps every row the same size when the selected one gets the dark border.
      borderWidth: 2,
      borderColor: 'transparent',
    },
    selected: { borderColor: c.ink },
  }),
);
