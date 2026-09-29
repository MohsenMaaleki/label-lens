import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { LANGUAGES } from '../config';
import { isRTL } from '../i18n';
import { LangProvider, useLang } from '../lang';
import { Button, IconButton, Marker, T } from '../components/ui';
import { latin, themed, useTheme } from '../theme';

interface Props {
  current: string | null;
  firstRun: boolean;
  onPick: (code: string) => void;
  onBack: () => void;
}

/** Welcome on first run, language picker later. The screen switches language as soon as one is tapped. */
export default function LanguageScreen(props: Props) {
  const [selected, setSelected] = useState(props.current ?? 'en');
  return (
    <LangProvider lang={selected}>
      <Picker {...props} selected={selected} onSelect={setSelected} />
    </LangProvider>
  );
}

function Picker({ firstRun, onPick, onBack, selected, onSelect }: Props & { selected: string; onSelect: (code: string) => void }) {
  const { t, rtl } = useLang();
  const { c } = useTheme();
  const s = useStyles();
  return (
    <View style={{ flex: 1, direction: rtl ? 'rtl' : 'ltr' }}>
      {firstRun ? null : (
        <View style={s.topBar}>
          <IconButton icon="arrow-left" label={t.back} onPress={onBack} />
        </View>
      )}
      <ScrollView contentContainerStyle={s.content}>
        {firstRun ? <WelcomeArt /> : null}

        <View style={{ gap: 8 }}>
          {firstRun ? (
            <>
              <T v="display">
                {t.welcomeTitle[0]}
                <Marker>{t.welcomeTitle[1]}</Marker>
                {t.welcomeTitle[2]}
              </T>
              <T v="body" color={c.ink2}>
                {t.welcomeSub}
              </T>
            </>
          ) : (
            <T v="display">{t.chooseLanguage}</T>
          )}
        </View>

        <View style={{ gap: 10 }}>
          <T v="label" color={c.sub} accessibilityRole="header">
            {t.explainIn}
          </T>
          <View style={s.grid}>
            {LANGUAGES.map((l) => {
              const on = selected === l.code;
              return (
                <Pressable
                  key={l.code}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${l.native}, ${l.label}`}
                  onPress={() => onSelect(l.code)}
                  style={[s.lang, on && s.langOn, { direction: isRTL(l.code) ? 'rtl' : 'ltr' }]}
                >
                  <View style={{ flex: 1 }}>
                    {/* Two lines, not one: with large system text "Italiano semplice" was cut off. */}
                    <T v="bodyBold" contentLang={l.code} numberOfLines={2}>
                      {l.native}
                    </T>
                    {l.code === 'en' ? null : (
                      /* Grey only on white: on the grey of the chosen language it would be too faint. */
                      <T v="caption" latinText color={on ? c.ink2 : c.sub} numberOfLines={2}>
                        {l.label}
                      </T>
                    )}
                  </View>
                  {on ? (
                    <View style={s.check}>
                      <Feather name="check" size={14} color={c.onPill} />
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={s.dock}>
        <Button title={t.continue} iconEnd="arrow-right" onPress={() => onPick(selected)} />
      </View>
    </View>
  );
}

/** The sample letter, tilted, with two highlighted lines under a lens. */
function WelcomeArt() {
  const s = useStyles();
  return (
    <View style={s.art} importantForAccessibility="no-hide-descendants">
      <Image source={require('../../assets/sample-letter.jpg')} style={s.artLetter} />
      <View style={[s.artMark, { left: 96, top: 92, width: 132 }]} />
      <View style={[s.artMark, { left: 90, top: 114, width: 86 }]} />
      <View style={s.artLens} />
      <View style={s.artHandle} />
      <View style={s.artBadge}>
        <T v="captionBold" latinText style={latin.extra}>
          Label Lens
        </T>
      </View>
    </View>
  );
}

const useStyles = themed(({ c, shadow }) =>
  StyleSheet.create({
    content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 24, gap: 18 },
    // The Android top bar: a back arrow at the start, like the result screen.
    topBar: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 4 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    lang: {
      flexBasis: '45%',
      flexGrow: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minHeight: 60,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: c.card,
      // A clear border keeps every chip the same size when one gets the dark border.
      borderWidth: 2,
      borderColor: 'transparent',
    },
    langOn: { backgroundColor: c.mist, borderColor: c.ink },
    check: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: c.pill },
    dock: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14 },
    art: { height: 150, borderRadius: 28, backgroundColor: c.mist, overflow: 'hidden' },
    artLetter: {
      position: 'absolute',
      left: 70,
      top: 22,
      width: 190,
      height: 268,
      borderRadius: 6,
      transform: [{ rotate: '-6deg' }],
      ...shadow.letter,
    },
    artMark: {
      position: 'absolute',
      height: 13,
      borderRadius: 5,
      backgroundColor: c.markerWash,
      transform: [{ rotate: '-6deg' }],
    },
    artLens: {
      position: 'absolute',
      left: 190,
      top: 30,
      width: 88,
      height: 88,
      borderRadius: 44,
      borderWidth: 6,
      borderColor: c.ink,
      backgroundColor: c.lensGlass,
    },
    artHandle: {
      position: 'absolute',
      left: 258,
      top: 105,
      width: 46,
      height: 13,
      borderRadius: 7,
      backgroundColor: c.ink,
      transform: [{ rotate: '45deg' }],
    },
    artBadge: {
      position: 'absolute',
      right: 12,
      bottom: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: c.card,
    },
  }),
);
