import * as Notifications from 'expo-notifications';
import type { Strings } from './i18n';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** Schedules a reminder 3 days and 1 day before each deadline (9:00 local), worded in the UI language. */
export async function scheduleDeadlineReminders(title: string, deadlines: { date: string; what: string }[], t: Strings) {
  const perm = await Notifications.requestPermissionsAsync();
  if (!perm.granted) return [];

  const ids: string[] = [];
  for (const d of deadlines) {
    const due = new Date(`${d.date}T09:00:00`);
    if (isNaN(due.getTime())) continue;
    for (const daysBefore of [3, 1]) {
      const when = new Date(due.getTime() - daysBefore * 86400000);
      if (when.getTime() <= Date.now()) continue;
      ids.push(
        await Notifications.scheduleNotificationAsync({
          content: { title, body: `${d.what} (${t.inDays(daysBefore)}, ${d.date})` },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
        }),
      );
    }
  }
  return ids;
}

export async function cancelReminders(ids: string[]) {
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
}
