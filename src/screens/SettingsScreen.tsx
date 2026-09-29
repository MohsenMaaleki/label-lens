import { Alert, Pressable, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import type { ReactNode } from 'react';
import { APP_VERSION, FREE_SCANS_PER_WEEK, LANGUAGES } from '../config';
import { useLang } from '../lang';
import { openCustomerCenter, purchasesReady, restore } from '../purchases';
import { Icon, IconButton, ProBadge, ProButton, T, type IconName } from '../components/ui';
import { showSnack } from '../components/Snackbar';
import { RADIUS, themed, useTheme } from '../theme';

interface Props {
  pro: boolean;
  used: number;
  onBack: () => void;
  onLanguage: () => void;
  onGoPro: () => void;
  onDeleteAll: () => void;
}

export default function SettingsScreen({ pro, used, onBack, onLanguage, onGoPro, onDeleteAll }: Props) {
  const { t, lang } = useLang();
  const { c } = useTheme();
  const s = useStyles();
  const current = LANGUAGES.find((l) => l.code === lang);
  const left = Math.max(0, FREE_SCANS_PER_WEEK - used);

  async function onRestore() {
    if (!purchasesReady()) return showSnack(t.proUnavailable, lang);
    try {
      showSnack((await restore()) ? t.restored : t.nothingToRestore, lang);
    } catch {
      showSnack(t.tryAgain, lang);
    }
  }

  async function onManage() {
    if (!purchasesReady()) return showSnack(t.proUnavailable, lang);
    await openCustomerCenter().catch(() => showSnack(t.tryAgain, lang));
  }

  function confirmDeleteAll() {
    Alert.alert(t.deleteAllTitle, t.deleteAllBody, [
      { text: t.cancel, style: 'cancel' },
      { text: t.delete, style: 'destructive', onPress: onDeleteAll },
    ]);
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={s.topBar}>
        <IconButton icon="arrow-left" label={t.back} onPress={onBack} />
      </View>
      <ScrollView contentContainerStyle={s.content}>
        <T v="display">{t.settings}</T>

        <Group title={t.language}>
          <Row icon="globe" tint={c.mist} iconColor={c.ink} onPress={onLanguage} chevron>
            <T v="bodyBold" style={{ flex: 1 }}>
              {t.explainIn}
            </T>
            <T v="small" color={c.ink2} contentLang={lang}>
              {current?.native ?? 'English'}
            </T>
          </Row>
        </Group>

        <Group title="Label Lens Pro">
          <View style={s.plan}>
            <ProBadge />
            <View style={s.planText}>
              <T v="bodyBold">{pro ? t.proPlan : t.freePlan}</T>
              <T v="caption" color={c.ink2}>
                {pro ? t.proUnlimited : t.freeLeft(left, FREE_SCANS_PER_WEEK)}
              </T>
            </View>
            {pro ? null : <ProButton title={t.goPro} onPress={onGoPro} />}
          </View>
          <Row icon="refresh-cw" tint={c.mistSoft} iconColor={c.ink} onPress={onRestore} line>
            <T v="bodyBold" style={{ flex: 1 }}>
              {t.restore}
            </T>
          </Row>
          <Row icon="external-link" tint={c.mistSoft} iconColor={c.ink} onPress={onManage} line>
            <T v="bodyBold" style={{ flex: 1 }}>
              {t.manage}
            </T>
          </Row>
        </Group>

        <Group title={t.reminders}>
          <Row icon="bell" tint={c.yellow} iconColor={c.ink}>
            <T v="small" style={{ flex: 1 }}>
              {t.remindersInfo}
            </T>
          </Row>
        </Group>

        <Group title={t.privacy}>
          <Row icon="lock" tint={c.green} iconColor={c.ink}>
            <T v="small" style={{ flex: 1 }}>
              {t.privacyInfo}
            </T>
          </Row>
          <Row icon="trash-2" tint={c.redSoft} iconColor={c.redText} onPress={confirmDeleteAll} line>
            <T v="bodyBold" color={c.redText} style={{ flex: 1 }}>
              {t.deleteAll}
            </T>
          </Row>
        </Group>

        <Group title={t.about}>
          <View style={{ padding: 18, gap: 4 }}>
            <T v="small" color={c.ink2}>
              {t.aboutInfo}
            </T>
            <T v="caption" color={c.sub}>
              {t.version(APP_VERSION)}
            </T>
          </View>
        </Group>
      </ScrollView>
    </View>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  const { c } = useTheme();
  const s = useStyles();
  return (
    <View style={{ gap: 8 }}>
      <T v="label" color={c.sub} accessibilityRole="header">
        {title}
      </T>
      <View style={s.group}>{children}</View>
    </View>
  );
}

function Row({
  icon,
  iconColor,
  tint,
  onPress,
  chevron,
  line,
  children,
}: {
  icon: IconName;
  iconColor: string;
  tint?: string;
  onPress?: () => void;
  chevron?: boolean;
  line?: boolean;
  children: ReactNode;
}) {
  const { c } = useTheme();
  const s = useStyles();
  const style: ViewStyle[] = [s.row, line ? s.rowLine : {}];
  const content = (
    <>
      <View style={[s.rowIcon, tint ? { backgroundColor: tint } : null]}>
        <Feather name={icon} size={19} color={iconColor} />
      </View>
      {children}
      {chevron ? <Icon name="chevron-right" size={18} color={c.sub} /> : null}
    </>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [...style, pressed && { opacity: 0.7 }]}>
      {content}
    </Pressable>
  ) : (
    <View style={style}>{content}</View>
  );
}

const useStyles = themed(({ c }) =>
  StyleSheet.create({
    content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 32, gap: 18 },
    // The Android top bar: a back arrow at the start, like the result screen.
    topBar: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 4 },
    group: { borderRadius: RADIUS.card, backgroundColor: c.card, overflow: 'hidden' },
    // Wraps: with large text or a long translation, the Go Pro button moves to its own line.
    plan: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 12, rowGap: 10, padding: 16 },
    // No flexShrink: Yoga ignores flexBasis when a single child can both grow and shrink, and the row never wraps.
    planText: { flexGrow: 1, flexBasis: 150, gap: 2 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 60, paddingHorizontal: 16, paddingVertical: 10 },
    rowLine: { borderTopWidth: 1, borderTopColor: c.line },
    rowIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  }),
);
