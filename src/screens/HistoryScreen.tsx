import { useMemo } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useLang } from '../lang';
import { upcomingDeadlines } from '../dates';
import { Button, IconButton, T } from '../components/ui';
import { ScanRow } from '../components/ScanRow';
import { useTheme } from '../theme';
import type { Scan } from '../types';

interface Props {
  scans: Scan[];
  onOpen: (scan: Scan) => void;
  onBack: () => void;
  onScan: () => void;
}

export default function HistoryScreen({ scans, onOpen, onBack, onScan }: Props) {
  const { t } = useLang();
  const { c } = useTheme();

  // Letters with a deadline ahead come first, soonest on top; the rest follow in saved order.
  const sections = useMemo(() => {
    const next = new Map(scans.map((scan) => [scan.id, upcomingDeadlines(scan)[0]?.date ?? '']));
    const due = (scan: Scan) => next.get(scan.id) ?? '';
    const comingUp = scans.filter(due).sort((a, b) => due(a).localeCompare(due(b)));
    const earlier = scans.filter((scan) => !due(scan));
    return [
      { key: 'coming', title: t.comingUp, data: comingUp },
      { key: 'earlier', title: t.earlier, data: earlier },
    ].filter((section) => section.data.length > 0);
  }, [scans, t]);

  return (
    <View style={{ flex: 1 }}>
      <View style={s.topBar}>
        <IconButton icon="arrow-left" label={t.back} onPress={onBack} />
      </View>
      {/* Virtualized: only the rows near the screen are drawn, however many letters are saved. */}
      <SectionList
        sections={sections}
        keyExtractor={(scan) => scan.id}
        renderItem={({ item }) => <ScanRow scan={item} onPress={() => onOpen(item)} />}
        renderSectionHeader={({ section }) => (
          <T v="label" color={c.sub} accessibilityRole="header" style={s.sectionHeader}>
            {section.title}
          </T>
        )}
        ItemSeparatorComponent={RowGap}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={s.content}
        ListHeaderComponent={
          <View style={{ gap: 6 }}>
            <T v="display">{t.myDocuments}</T>
            <View style={s.note}>
              <Feather name="lock" size={14} color={c.sub} />
              <T v="small" color={c.sub} style={{ flex: 1 }}>
                {t.savedOnPhone}
              </T>
            </View>
            {scans.length === 0 ? (
              <T color={c.sub} style={{ marginTop: 14 }}>
                {t.noScans}
              </T>
            ) : null}
          </View>
        }
        ListFooterComponent={
          <View style={{ marginTop: 20 }}>
            <Button kind="secondary" icon="camera" title={t.scanAnother} onPress={onScan} />
          </View>
        }
      />
    </View>
  );
}

function RowGap() {
  return <View style={{ height: 10 }} />;
}

const s = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 32 },
  // The Android top bar: a back arrow at the start, like the result screen.
  topBar: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 4 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionHeader: { marginTop: 20, marginBottom: 10 },
});
