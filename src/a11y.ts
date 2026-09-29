import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Android 16 deprecates spoken announcements: on Android, text that changes is read aloud from a
 * live region (`accessibilityLiveRegion`) instead. iOS has no live regions, so it still gets one.
 */
export function announceOnIOS(text: string) {
  if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(text);
}
