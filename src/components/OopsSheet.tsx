import { Image, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useLang } from '../lang';
import { themed, useTheme } from '../theme';
import type { ApiErrorKind } from '../api';
import { Button, Sheet, T, type IconName } from './ui';

export type OopsKind = Exclude<ApiErrorKind, 'canceled'> | 'permission';

interface Props {
  kind: OopsKind | null;
  imageUri?: string;
  onClose: () => void;
  onCamera: () => void;
  onLibrary: () => void;
  onRetry: () => void;
}

/** A friendly bottom sheet when a scan cannot be explained. Failed scans never use a free scan. */
export function OopsSheet({ kind, imageUri, onClose, onCamera, onLibrary, onRetry }: Props) {
  const { t } = useLang();
  const { c } = useTheme();
  const s = useStyles();
  const photoProblem = kind === 'unreadable' || kind === 'not_a_document';
  const text: Record<OopsKind, [string, string]> = {
    unreadable: [t.unreadableTitle, t.noScanUsed],
    not_a_document: [t.notDocTitle, t.notDocBody],
    network: [t.networkTitle, t.networkBody],
    timeout: [t.timeoutTitle, t.timeoutBody],
    server: [t.serverTitle, t.serverBody],
    permission: [t.permissionTitle, t.cameraPermission],
  };
  const [title, body] = kind ? text[kind] : ['', ''];
  const tips: [IconName, string, string, string][] = [
    ['sun', t.tipLight, c.yellow, c.ink],
    ['maximize', t.tipFit, c.mist, c.ink],
    ['target', t.tipSteady, c.green, c.ink],
  ];

  return (
    <Sheet visible={!!kind} onClose={onClose}>
      <View style={s.body}>
        <View style={s.head}>
          {imageUri && photoProblem ? (
            <View>
              <Image source={{ uri: imageUri }} blurRadius={3} style={s.thumb} />
              <View style={s.badge}>
                <Feather name="alert-triangle" size={16} color={c.ink} />
              </View>
            </View>
          ) : null}
          <View style={{ flex: 1, gap: 6 }}>
            <T v="title">{title}</T>
            <T v="small" color={c.ink2}>
              {body}
            </T>
          </View>
        </View>

        {kind === 'unreadable' ? (
          <View style={{ gap: 10 }}>
            {tips.map(([icon, label, bg, fg]) => (
              <View key={label} style={s.tip}>
                <View style={[s.tipIcon, { backgroundColor: bg }]}>
                  <Feather name={icon} size={20} color={fg} />
                </View>
                <T style={{ flex: 1 }}>{label}</T>
              </View>
            ))}
          </View>
        ) : null}

        <View style={{ gap: 10 }}>
          {photoProblem ? (
            <>
              <Button icon="camera" title={t.takeNew} onPress={onCamera} />
              <Button kind="secondary" title={t.chooseAnother} onPress={onLibrary} />
            </>
          ) : kind === 'permission' ? (
            <>
              <Button icon="image" title={t.chooseAnother} onPress={onLibrary} />
              <Button kind="secondary" title={t.close} onPress={onClose} />
            </>
          ) : (
            <>
              <Button icon="refresh-cw" title={t.retry} onPress={onRetry} />
              <Button kind="secondary" title={t.close} onPress={onClose} />
            </>
          )}
        </View>
      </View>
    </Sheet>
  );
}

const useStyles = themed(({ c }) =>
  StyleSheet.create({
    body: { paddingHorizontal: 24, paddingTop: 18, paddingBottom: 8, gap: 20 },
    head: { flexDirection: 'row', alignItems: 'center', gap: 18 },
    thumb: { width: 72, height: 96, borderRadius: 16, backgroundColor: c.mist },
    badge: {
      position: 'absolute',
      end: -9,
      bottom: -9,
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 3,
      borderColor: c.card,
      backgroundColor: c.yellow,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tip: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    tipIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  }),
);
