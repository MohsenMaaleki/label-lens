import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Feather from '@expo/vector-icons/Feather';
import { announceOnIOS } from '../a11y';
import { askQuestion } from '../api';
import { LANGUAGES } from '../config';
import { LangProvider, useLang } from '../lang';
import { daysUntil, dueTone, isIsoDate, upcomingDeadlines } from '../dates';
import { cancelReminders, scheduleDeadlineReminders } from '../reminders';
import {
  Button,
  Card,
  Chip,
  DateTile,
  FadeIn,
  Icon,
  IconButton,
  LRM,
  Marker,
  ProBadge,
  SectionTitle,
  Sheet,
  T,
} from '../components/ui';
import { showSnack } from '../components/Snackbar';
import { RADIUS, docIcon, latin, mono, themed, useTheme } from '../theme';
import { strings, type Strings } from '../i18n';
import type { ChatTurn, LensResult, Scan } from '../types';

interface Props {
  scan: Scan;
  pro: boolean;
  requirePro: () => Promise<boolean>;
  onBack: () => void;
  onUpdate: (scan: Scan) => void;
  onDelete: (scan: Scan) => void;
  /** The app's currently chosen language, which may differ from the one this scan was explained in. */
  uiLanguage: string;
}

/** The whole page follows the language the letter was explained in, even if the UI language changed since. */
export default function ResultScreen(props: Props) {
  return (
    <LangProvider lang={props.scan.language}>
      <Result {...props} />
    </LangProvider>
  );
}

const hasArabicScript = (s: string) => /[؀-ۿ]/.test(s);

function Result({ scan, pro, requirePro, onBack, onUpdate, onDelete, uiLanguage }: Props) {
  const { t, rtl, lang } = useLang();
  const { c, tones } = useTheme();
  const s = useStyles();
  const r = scan.result;
  const [askOpen, setAskOpen] = useState(false);
  const [asking, setAsking] = useState(false);
  const [copied, setCopied] = useState(false);
  // The scan as last saved, for an answer that arrives after the question was added.
  const latest = useRef(scan);
  useEffect(() => {
    latest.current = scan;
  }, [scan]);

  const primary = upcomingDeadlines(scan)[0] ?? null;
  const others = r.deadlines.filter((d) => d !== primary);
  const primaryDays = primary ? daysUntil(primary.date) : 0;
  const hasReminders = scan.reminderIds.length > 0;
  // The app's own strings, not this page's (which follow the scan's language): for a label about the mismatch itself.
  const scannedInOther = uiLanguage !== lang ? strings(uiLanguage).scannedIn(LANGUAGES.find((l) => l.code === lang)?.native ?? lang) : null;

  // Step numbers: red when urgent, orange when it matters, green when it can wait. Always dark digits.
  const urgencyFill = { high: c.red, medium: c.orange, low: c.green } as const;

  async function toggleReminders() {
    if (hasReminders) {
      await cancelReminders(scan.reminderIds);
      onUpdate({ ...scan, reminderIds: [] });
      return;
    }
    if (!(await requirePro())) return;
    const ids = await scheduleDeadlineReminders(r.title, r.deadlines, t);
    if (!ids.length) showSnack(t.noUpcomingBody, lang);
    onUpdate({ ...scan, reminderIds: ids });
  }

  async function ask(question: string) {
    const text = question.trim();
    if (!text || asking) return;
    const base = latest.current;
    const chat = [...base.chat, { role: 'user' as const, text }];
    onUpdate({ ...base, chat });
    setAsking(true);
    try {
      const language = LANGUAGES.find((l) => l.code === base.language)?.label ?? 'English';
      const { answer } = await askQuestion(base.result, text, base.chat, language);
      onUpdate({ ...latest.current, chat: [...chat, { role: 'model', text: answer }] });
      // Android reads the answer from the chat's live region; iOS needs an announcement.
      announceOnIOS(answer);
    } catch {
      Alert.alert(t.couldNotAnswer, t.tryAgain);
      onUpdate({ ...latest.current, chat: base.chat });
    } finally {
      setAsking(false);
    }
  }

  async function openAsk(question?: string) {
    if (!(await requirePro())) return;
    setAskOpen(true);
    if (question) ask(question);
  }

  function confirmDelete() {
    Alert.alert(t.deleteTitle, t.deleteBody, [
      { text: t.cancel, style: 'cancel' },
      { text: t.delete, style: 'destructive', onPress: () => onDelete(scan) },
    ]);
  }

  async function copyCode(code: string) {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // A short cascade, capped so the last card starts within 200 ms: people came here to read.
  let order = 0;
  const delay = () => Math.min(order++, 5) * 40;

  return (
    <View style={{ flex: 1, direction: rtl ? 'rtl' : 'ltr' }}>
      <View style={s.topBar}>
        <IconButton icon="arrow-left" label={t.back} onPress={onBack} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <IconButton icon="share-2" label={t.share} onPress={() => Share.share({ message: shareText(r, t) }).catch(() => {})} />
          <IconButton icon="trash-2" label={t.delete} onPress={confirmDelete} color={c.redText} />
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <FadeIn delay={delay()} style={s.head}>
          <Image source={{ uri: scan.imageUri }} style={s.image} />
          <View style={s.headText}>
            <Chip tone="neutral" icon={docIcon[r.doc_type] ?? docIcon.other} text={t.docType[r.doc_type] ?? t.docType.other} />
            <T v="title">{r.title}</T>
            {r.issuer ? (
              <T v="captionBold" latinText color={c.sub} style={{ letterSpacing: 0.4 }}>
                {r.issuer}
              </T>
            ) : null}
            <Chip
              tone={r.confidence === 'high' ? 'ok' : r.confidence === 'low' ? 'urgent' : 'soon'}
              icon="shield"
              text={t.confidence[r.confidence] ?? t.confidence.medium}
            />
            {scannedInOther ? (
              <T v="caption" color={c.sub} contentLang={uiLanguage}>
                {scannedInOther}
              </T>
            ) : null}
          </View>
        </FadeIn>

        <FadeIn delay={delay()}>
          <Card>
            <T v="captionBold" color={c.sub}>
              {t.plainWords}
            </T>
            <T style={{ fontSize: 17, lineHeight: rtl ? 31 : 26 }}>{r.summary}</T>
          </Card>
        </FadeIn>

        {r.deadlines.length > 0 ? (
          <FadeIn delay={delay()}>
            <View style={s.deadlineCard}>
              {primary ? (
                <View style={s.deadlineMain}>
                  <DateTile iso={primary.date} tone={dueTone(primaryDays)} large />
                  <View style={{ flex: 1, gap: 4 }}>
                    <T v="captionBold" color={tones[dueTone(primaryDays)].fg}>
                      {`${t.deadline} · ${t.inDays(primaryDays)}`}
                    </T>
                    <T v="bodyBold" style={{ fontSize: 17, lineHeight: rtl ? 30 : 24 }}>
                      {primary.what}
                    </T>
                    {primary.approximate ? (
                      <T v="caption" color={c.sub}>
                        {t.approxNote}
                      </T>
                    ) : null}
                  </View>
                </View>
              ) : null}
              {others.map((d, k) => {
                const hasDate = isIsoDate(d.date);
                return (
                  <View key={k} style={s.deadlineRow}>
                    {hasDate ? (
                      <DateTile iso={d.date} tone={dueTone(daysUntil(d.date))} />
                    ) : (
                      <View style={s.deadlineIcon}>
                        <Feather name="calendar" size={17} color={c.sub} />
                      </View>
                    )}
                    <View style={{ flex: 1, gap: 2 }}>
                      <T v="small">{d.what}</T>
                      {hasDate && d.approximate ? (
                        <T v="caption" color={c.sub}>
                          {t.approxNote}
                        </T>
                      ) : null}
                    </View>
                  </View>
                );
              })}
              <View style={s.remind}>
                <Button
                  kind={hasReminders ? 'secondary' : 'soft'}
                  icon={hasReminders ? 'bell-off' : 'bell'}
                  title={hasReminders ? t.remindersOn : t.remindMe}
                  // For screen readers one switch: "Remind me, 3 and 1 days before, Pro, switch, off".
                  accessibilityRole="switch"
                  accessibilityState={{ checked: hasReminders }}
                  accessibilityLabel={[t.remindMe, t.remindWhen, pro ? null : 'Pro'].filter(Boolean).join(', ')}
                  onPress={toggleReminders}
                >
                  {hasReminders ? null : (
                    <T v="caption" color={c.ink2} numberOfLines={1}>
                      {t.remindWhen}
                    </T>
                  )}
                  {!pro && !hasReminders ? <ProBadge /> : null}
                </Button>
              </View>
            </View>
          </FadeIn>
        ) : null}

        {r.actions.length > 0 ? (
          <FadeIn delay={delay()} style={{ gap: 10 }}>
            <SectionTitle icon="check-circle" title={t.whatToDo} />
            {r.actions.map((a, k) => (
              <View key={k} style={s.step}>
                <View style={[s.num, { backgroundColor: urgencyFill[a.urgency] ?? c.orange }]}>
                  {/* The circle has a fixed size, so the number may only grow a little with the system font size. */}
                  <Text
                    maxFontSizeMultiplier={1.25}
                    style={[latin.display, { fontSize: 16, color: a.urgency === 'high' ? c.onRed : c.ink }]}
                  >
                    {k + 1}
                  </Text>
                </View>
                <T style={{ flex: 1 }}>{a.step}</T>
              </View>
            ))}
          </FadeIn>
        ) : null}

        {r.payment?.code ? (
          <FadeIn delay={delay()}>
            <View style={s.payCard}>
              <View style={s.rowBetween}>
                <T v="captionBold" color={c.ticketText}>
                  {t.payWith}
                </T>
                {r.payment.method ? (
                  <View style={s.method}>
                    <T v="captionBold" latinText color={c.onDark}>
                      {r.payment.method}
                    </T>
                  </View>
                ) : null}
              </View>
              <Text selectable style={[mono, s.code]}>
                {LRM}
                {r.payment.code}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => copyCode(r.payment!.code)}
                style={({ pressed }) => [s.copy, pressed && { opacity: 0.8 }]}
              >
                <Feather name={copied ? 'check' : 'copy'} size={17} color={c.onMarker} />
                <T v="smallBold" color={c.onMarker}>
                  {copied ? t.copied : t.copy}
                </T>
              </Pressable>
            </View>
          </FadeIn>
        ) : null}

        {r.key_facts.length > 0 ? (
          <FadeIn delay={delay()} style={{ gap: 10 }}>
            <SectionTitle icon="file-text" title={t.keyDetails} />
            <Card style={s.list}>
              {r.key_facts.map((f, k) => (
                <View key={k} style={[s.item, k < r.key_facts.length - 1 && s.itemLine]}>
                  <T v="caption" color={c.sub}>
                    {f.label}
                  </T>
                  <T v="bodyBold" latinText={!hasArabicScript(f.value)} style={{ fontSize: 17 }}>
                    {/€|EUR/.test(f.value) ? <Marker>{f.value}</Marker> : f.value}
                  </T>
                </View>
              ))}
            </Card>
          </FadeIn>
        ) : null}

        {r.warnings.length > 0 ? (
          <FadeIn delay={delay()} style={{ gap: 10 }}>
            <SectionTitle icon="alert-triangle" title={t.watchOut} />
            <Card fill={c.yellowSoft} style={{ gap: 8 }}>
              {r.warnings.map((w, k) => (
                <T key={k}>{`• ${w}`}</T>
              ))}
            </Card>
          </FadeIn>
        ) : null}

        {r.glossary.length > 0 ? (
          <FadeIn delay={delay()} style={{ gap: 10 }}>
            <SectionTitle icon="book-open" title={t.words} />
            <Card fill={c.lavenderSoft} style={{ gap: 14 }}>
              {r.glossary.map((g, k) => (
                <View key={k} style={{ gap: 2 }}>
                  <T v="bodyBold" latinText={!hasArabicScript(g.term)}>
                    {g.term}
                  </T>
                  <T v="small" color={c.ink2}>
                    {g.meaning}
                  </T>
                </View>
              ))}
            </Card>
          </FadeIn>
        ) : null}

        {r.unclear_parts.length > 0 ? (
          <T v="caption" color={c.sub}>
            {t.unclear(r.unclear_parts.join('; '))}
          </T>
        ) : null}

        <FadeIn delay={delay()} style={{ gap: 10 }}>
          <SectionTitle icon="message-circle" title={t.askTitle} right={pro ? null : <ProBadge />} />
          {scan.chat.length > 0 ? (
            <Pressable accessibilityRole="button" onPress={() => openAsk()} style={s.lastAnswer}>
              <T v="small" color={c.ink2} numberOfLines={3}>
                {scan.chat[scan.chat.length - 1].text}
              </T>
            </Pressable>
          ) : (
            <View style={{ gap: 8, alignItems: 'flex-start' }}>
              {t.suggested.map((q) => (
                <Pressable key={q} accessibilityRole="button" onPress={() => openAsk(q)} style={s.suggest}>
                  <T v="smallBold">{q}</T>
                </Pressable>
              ))}
            </View>
          )}
          <Pressable accessibilityRole="button" onPress={() => openAsk()} style={s.fakeInput}>
            <T color={c.sub} style={{ flex: 1 }}>
              {t.askPlaceholder}
            </T>
            <View style={s.sendDot}>
              <Icon name="send" size={18} color={c.onPill} />
            </View>
          </Pressable>
        </FadeIn>

        <T v="caption" color={c.sub} style={{ marginTop: 6 }}>
          {t.disclaimer}
        </T>
      </ScrollView>

      <AskSheet visible={askOpen} onClose={() => setAskOpen(false)} chat={scan.chat} asking={asking} onAsk={ask} />
    </View>
  );
}

function AskSheet({
  visible,
  onClose,
  chat,
  asking,
  onAsk,
}: {
  visible: boolean;
  onClose: () => void;
  chat: ChatTurn[];
  asking: boolean;
  onAsk: (question: string) => void;
}) {
  const { t, f } = useLang();
  const { c } = useTheme();
  const s = useStyles();
  const [q, setQ] = useState('');
  const list = useRef<ScrollView>(null);
  // The newest answer has one bubble that stays mounted: first the spinner, then the answer.
  // Its label is the answer: when the label of a live region changes, TalkBack reads it aloud.
  const last = chat[chat.length - 1];
  const latest = last?.role === 'model' ? last : null;
  const history = latest ? chat.slice(0, -1) : chat;

  function send(text: string) {
    if (!text.trim() || asking) return;
    onAsk(text);
    setQ('');
  }

  return (
    <Sheet visible={visible} onClose={onClose}>
      <KeyboardAvoidingView behavior="padding">
        <View style={s.sheetHead}>
          <View style={{ flex: 1, gap: 2 }}>
            <T v="h2">{t.askTitle}</T>
            <T v="caption" color={c.sub}>
              {t.askSub}
            </T>
          </View>
          <IconButton icon="x" label={t.close} onPress={onClose} bg={c.bg} />
        </View>

        <ScrollView
          ref={list}
          style={{ maxHeight: 440 }}
          contentContainerStyle={s.chat}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
        >
          {history.map((m, k) => (
            <View key={k} style={[s.bubble, m.role === 'user' ? s.userBubble : s.botBubble]}>
              <T color={m.role === 'user' ? c.onPill : c.ink} selectable>
                {m.text}
              </T>
            </View>
          ))}
          {chat.length === 0 && !asking ? (
            <View style={{ gap: 8, alignItems: 'flex-start' }}>
              {t.suggested.map((sq) => (
                <Pressable key={sq} accessibilityRole="button" onPress={() => send(sq)} style={s.suggest}>
                  <T v="smallBold">{sq}</T>
                </Pressable>
              ))}
            </View>
          ) : null}
          <View
            accessible
            accessibilityLabel={!asking && latest ? latest.text : undefined}
            accessibilityLiveRegion="polite"
            style={asking || latest ? [s.bubble, s.botBubble] : null}
          >
            {asking ? <ActivityIndicator color={c.ink} /> : latest ? <T selectable>{latest.text}</T> : null}
          </View>
        </ScrollView>

        <View style={s.inputRow}>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={t.askPlaceholder}
            placeholderTextColor={c.sub}
            accessibilityLabel={t.askPlaceholder}
            onSubmitEditing={() => send(q)}
            returnKeyType="send"
            style={[s.input, f.regular]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.send}
            onPress={() => send(q)}
            disabled={!q.trim() || asking}
            style={[s.sendButton, (!q.trim() || asking) && { opacity: 0.5 }]}
          >
            <Icon name="send" size={20} color={c.onPill} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Sheet>
  );
}

/** Plain text for the share sheet: messaging apps, email, notes. */
function shareText(r: LensResult, t: Strings) {
  const parts: string[] = [r.title];
  if (r.issuer) parts.push(r.issuer);
  parts.push('', r.summary);
  if (r.deadlines.length) {
    parts.push('', `${t.deadline}:`, ...r.deadlines.map((d) => `• ${d.date ? `${d.date}: ` : ''}${d.what}`));
  }
  if (r.actions.length) parts.push('', `${t.whatToDo}:`, ...r.actions.map((a, i) => `${i + 1}. ${a.step}`));
  // LRM keeps a digits-only code in its printed order inside right-to-left text.
  if (r.payment?.code) parts.push('', `${t.payWith}: ${LRM}${r.payment.method ? `${r.payment.method} ` : ''}${r.payment.code}`);
  if (r.warnings.length) parts.push('', `${t.watchOut}:`, ...r.warnings.map((w) => `• ${w}`));
  parts.push('', t.sharedBy);
  return parts.join('\n');
}

const useStyles = themed(({ c }) =>
  StyleSheet.create({
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 4 },
    content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40, gap: 16 },
    head: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
    headText: { flex: 1, gap: 8, alignItems: 'flex-start' },
    image: { width: 76, height: 100, borderRadius: 16, backgroundColor: c.mist },
    deadlineCard: { borderRadius: RADIUS.card, backgroundColor: c.card, overflow: 'hidden' },
    deadlineMain: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 18 },
    deadlineRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderTopWidth: 1,
      borderTopColor: c.line,
    },
    // Same width as the small DateTile, so rows without a date still line up with rows that have one.
    deadlineIcon: { width: 66, alignItems: 'center' },
    remind: { padding: 18, paddingTop: 8 },
    step: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 14,
      padding: 18,
      borderRadius: RADIUS.card,
      backgroundColor: c.card,
    },
    num: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
    payCard: { gap: 12, padding: 20, borderRadius: RADIUS.card, backgroundColor: c.ticket },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    method: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: c.ticketChip },
    code: { color: c.onDark, fontSize: 22, lineHeight: 30, letterSpacing: 0.5, textAlign: 'left' },
    copy: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-end',
      gap: 6,
      minHeight: 48,
      paddingHorizontal: 18,
      borderRadius: 999,
      backgroundColor: c.marker,
    },
    list: { paddingVertical: 6, gap: 0 },
    item: { gap: 2, paddingVertical: 12 },
    itemLine: { borderBottomWidth: 1, borderBottomColor: c.line },
    lastAnswer: { padding: 18, borderRadius: RADIUS.row, backgroundColor: c.card },
    suggest: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 18, borderRadius: 999, backgroundColor: c.mist },
    fakeInput: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minHeight: 58,
      paddingStart: 20,
      paddingEnd: 6,
      borderRadius: 999,
      backgroundColor: c.card,
    },
    sendDot: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: c.pill },
    sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingStart: 20, paddingEnd: 12, paddingTop: 8 },
    chat: { padding: 16, gap: 12 },
    bubble: { maxWidth: '88%', paddingHorizontal: 16, paddingVertical: 11, borderRadius: 22 },
    userBubble: { alignSelf: 'flex-end', backgroundColor: c.pill },
    botBubble: { alignSelf: 'flex-start', backgroundColor: c.mist },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
      borderTopWidth: 1,
      borderTopColor: c.line,
    },
    input: {
      flex: 1,
      minHeight: 52,
      paddingHorizontal: 18,
      borderRadius: 999,
      backgroundColor: c.bg,
      color: c.ink,
      fontSize: 16,
    },
    sendButton: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: c.pill },
  }),
);
