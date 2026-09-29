import { StyleSheet, View } from 'react-native';
import { useLang } from '../lang';
import { useTheme } from '../theme';
import { IconCircle, T } from './ui';

/** The right pane on a tablet before a letter is open. */
export function EmptyDetail() {
  const { t } = useLang();
  const { c } = useTheme();
  return (
    <View style={s.wrap}>
      <IconCircle icon="file-text" size={72} bg={c.mist} />
      {/* Full width, centered with textAlign: a text shrunk to fit can lose its last word on Android. */}
      <T v="bodyBold" color={c.ink2} align="center" style={{ alignSelf: 'stretch' }}>
        {t.openLetterHint}
      </T>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
});
