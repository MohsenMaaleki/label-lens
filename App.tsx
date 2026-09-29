import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BackHandler, StyleSheet, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import Feather from '@expo/vector-icons/Feather';
import HomeScreen from './src/screens/HomeScreen';
import ResultScreen from './src/screens/ResultScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import LanguageScreen from './src/screens/LanguageScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ScanningScreen from './src/screens/ScanningScreen';
import { EmptyDetail } from './src/components/EmptyDetail';
import { OopsSheet, type OopsKind } from './src/components/OopsSheet';
import { SnackbarHost, hideSnack, showSnack } from './src/components/Snackbar';
import { ApiError, analyzeImage } from './src/api';
import { FREE_SCANS_PER_WEEK, LANGUAGES } from './src/config';
import { loadArabicFonts, useArabicFonts } from './src/fonts';
import { isRTL, strings } from './src/i18n';
import { LangProvider } from './src/lang';
import { configurePurchases, getCustomerInfo, isPro, onCustomerInfo, purchasesReady, showPaywall } from './src/purchases';
import { cancelReminders } from './src/reminders';
import { PermissionError, pickImage, prepareImage, type ScanSource } from './src/scan';
import { clearScans, deleteScan, getLanguage, loadScans, recentScanCount, recordScan, saveScan, setLanguage } from './src/storage';
import { MAX_WIDTH, TWO_PANE_MIN, fontFiles, useTheme } from './src/theme';
import type { Scan } from './src/types';

type Route =
  | { name: 'home' }
  | { name: 'result'; id: string }
  | { name: 'history' }
  | { name: 'settings' }
  | { name: 'language'; from: 'home' | 'settings' };

/** Where the language picker returns to. */
const back = (from: 'home' | 'settings'): Route => (from === 'home' ? { name: 'home' } : { name: 'settings' });

configurePurchases();
// The splash stays until the fonts and saved letters are loaded, so no empty frame shows in between.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [fontsLoaded] = useFonts({ ...fontFiles, ...Feather.font });
  const [ready, setReady] = useState(false);
  const [language, setLang] = useState<string | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [pro, setPro] = useState(false);
  const [used, setUsed] = useState(0);
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [scanning, setScanning] = useState<string | null>(null);
  const [oops, setOops] = useState<{ kind: OopsKind; source: ScanSource; imageUri?: string } | null>(null);
  const abort = useRef<AbortController | null>(null);
  const { c } = useTheme();
  const arabicFonts = useArabicFonts();
  const { width } = useWindowDimensions();
  const twoPane = width >= TWO_PANE_MIN;

  const lang = language ?? 'en';
  const t = strings(lang);
  // Vazirmatn only when Arabic script is on screen: the UI language, a saved letter or the language list.
  const needArabic =
    ready && (!language || isRTL(language) || route.name === 'language' || scans.some((s) => isRTL(s.language)));
  const arabicSettled = !needArabic || arabicFonts === 'ready' || arabicFonts === 'failed';

  useEffect(() => {
    (async () => {
      const [l, s, info, n] = await Promise.all([getLanguage(), loadScans(), getCustomerInfo(), recentScanCount()]);
      setLang(l);
      setScans(s);
      setPro(isPro(info));
      setUsed(n);
      setReady(true);
    })();
    return onCustomerInfo((info) => setPro(isPro(info)));
  }, []);

  // The window behind the app shows around the keyboard and between screens: keep it the page color.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(c.bg).catch(() => {});
  }, [c.bg]);

  useEffect(() => {
    if (needArabic) loadArabicFonts();
  }, [needArabic]);

  // At launch the splash also waits for Vazirmatn when it is needed, so Arabic-script text never jumps fonts.
  useEffect(() => {
    if (ready && fontsLoaded && arabicSettled) SplashScreen.hideAsync().catch(() => {});
  }, [ready, fontsLoaded, arabicSettled]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (scanning) {
        abort.current?.abort();
        return true;
      }
      if (route.name === 'home') return false;
      setRoute(route.name === 'language' ? back(route.from) : { name: 'home' });
      return true;
    });
    return () => sub.remove();
  }, [route, scanning]);

  // A message belongs to the screen it came from: on a new screen it would cover that screen's buttons.
  useEffect(() => {
    hideSnack();
  }, [route]);

  /** True when the user is Pro, possibly right after buying on the RevenueCat paywall. */
  async function requirePro() {
    if (pro) return true;
    if (!purchasesReady()) {
      showSnack(t.proUnavailable, lang);
      return false;
    }
    return showPaywall();
  }

  async function startScan(source: ScanSource) {
    setOops(null);
    // The bundled sample never uses a free scan, so anyone can try the app.
    if (source !== 'sample' && !pro && (await recentScanCount()) >= FREE_SCANS_PER_WEEK && !(await requirePro())) return;

    let picked;
    try {
      picked = await pickImage(source);
    } catch (e) {
      if (e instanceof PermissionError) setOops({ kind: 'permission', source });
      return;
    }
    if (!picked) return;

    const controller = new AbortController();
    abort.current = controller;
    setScanning(picked.uri);
    try {
      const image = await prepareImage(picked);
      const label = LANGUAGES.find((l) => l.code === lang)?.label ?? 'English';
      const result = await analyzeImage(image.base64, label, controller.signal);
      if (source !== 'sample' && !pro) {
        await recordScan();
        setUsed(await recentScanCount());
      }
      const scan: Scan = {
        id: String(Date.now()),
        createdAt: Date.now(),
        language: lang,
        imageUri: image.uri,
        result,
        chat: [],
        reminderIds: [],
      };
      await upsert(scan);
      setRoute({ name: 'result', id: scan.id });
    } catch (e) {
      const kind = e instanceof ApiError ? e.kind : 'server';
      if (kind !== 'canceled') setOops({ kind, source, imageUri: picked.uri });
    } finally {
      setScanning(null);
      abort.current = null;
    }
  }

  async function upsert(scan: Scan) {
    setScans((prev) => [scan, ...prev.filter((x) => x.id !== scan.id)]);
    await saveScan(scan);
  }

  async function remove(scan: Scan) {
    await cancelReminders(scan.reminderIds);
    setScans(await deleteScan(scan.id));
    setRoute({ name: 'home' });
  }

  async function removeAll() {
    await Promise.all(scans.map((s) => cancelReminders(s.reminderIds)));
    await clearScans();
    setScans([]);
  }

  async function pickLanguage(code: string) {
    setLang(code);
    await setLanguage(code);
    setRoute(route.name === 'language' ? back(route.from) : { name: 'home' });
  }

  if (!ready || !fontsLoaded) return null;
  // Arabic-script text is never drawn in the fallback font first, so it never visibly swaps fonts.
  const waitArabic = needArabic && !arabicSettled;
  // At launch the splash is still up. The language list keeps the previous screen for that moment.
  if (waitArabic && route.name !== 'language') return null;
  const shown: Route = waitArabic && route.name === 'language' ? back(route.from) : route;

  const openScan = (scan: Scan) => setRoute({ name: 'result', id: scan.id });
  const home = (
    <HomeScreen
      scans={scans}
      pro={pro}
      used={used}
      onScan={startScan}
      onOpen={openScan}
      onLanguage={() => setRoute({ name: 'language', from: 'home' })}
      onSettings={() => setRoute({ name: 'settings' })}
      onHistory={() => setRoute({ name: 'history' })}
      onGoPro={requirePro}
      selectedId={twoPane && shown.name === 'result' ? shown.id : undefined}
    />
  );

  // What opens over home on a phone, and next to it on a tablet.
  let detail: ReactNode = null;
  if (shown.name === 'result') {
    const scan = scans.find((x) => x.id === shown.id);
    detail = scan ? (
      <ResultScreen
        // A new letter starts at the top, with its own chat and state.
        key={scan.id}
        scan={scan}
        pro={pro}
        requirePro={requirePro}
        onBack={() => setRoute({ name: 'home' })}
        onUpdate={upsert}
        onDelete={remove}
        uiLanguage={lang}
      />
    ) : null;
  } else if (shown.name === 'history') {
    detail = (
      <HistoryScreen
        scans={scans}
        onOpen={openScan}
        onBack={() => setRoute({ name: 'home' })}
        onScan={() => startScan('camera')}
      />
    );
  } else if (shown.name === 'settings') {
    detail = (
      <SettingsScreen
        pro={pro}
        used={used}
        onBack={() => setRoute({ name: 'home' })}
        onLanguage={() => setRoute({ name: 'language', from: 'settings' })}
        onGoPro={requirePro}
        onDeleteAll={removeAll}
      />
    );
  }

  // Scanning and the language list always take the whole width.
  let single: ReactNode = null;
  if (scanning) single = <ScanningScreen imageUri={scanning} onCancel={() => abort.current?.abort()} />;
  else if (!language || shown.name === 'language') {
    single = (
      <LanguageScreen
        current={language}
        firstRun={!language}
        onPick={pickLanguage}
        onBack={() => setRoute(route.name === 'language' ? back(route.from) : { name: 'home' })}
      />
    );
  } else if (!twoPane) single = detail ?? home;

  return (
    <SafeAreaProvider>
      <LangProvider lang={lang}>
        <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
          <StatusBar style="auto" />
          <View style={{ flex: 1, direction: isRTL(lang) ? 'rtl' : 'ltr' }}>
            {single ? (
              <View style={s.column}>{single}</View>
            ) : (
              <View style={s.panes}>
                <View style={s.listPane}>{home}</View>
                <View style={[s.detailPane, { borderColor: c.line }]}>
                  <View style={s.column}>{detail ?? <EmptyDetail />}</View>
                </View>
              </View>
            )}
          </View>
          <OopsSheet
            kind={oops?.kind ?? null}
            imageUri={oops?.imageUri}
            onClose={() => setOops(null)}
            onCamera={() => startScan('camera')}
            onLibrary={() => startScan('library')}
            onRetry={() => oops && startScan(oops.source)}
          />
        </SafeAreaView>
        <SnackbarHost />
      </LangProvider>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  column: { flex: 1, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
  panes: { flex: 1, flexDirection: 'row', width: '100%', maxWidth: 1280, alignSelf: 'center' },
  listPane: { width: '38%', minWidth: 360, maxWidth: 440 },
  detailPane: { flex: 1, borderStartWidth: 1 },
});
