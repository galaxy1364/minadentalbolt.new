// notifications.ts — real OS-level notifications for due reminders,
// via the standard Web Notifications API through the already-
// registered service worker. Honest limitation: this is a
// foreground/while-open PWA notification, not a true server push that
// can wake a fully-closed app at a scheduled future time — that needs
// a push server (VAPID keys, subscription storage, a backend that
// sends the push) which is real infrastructure beyond what this
// client-only app can provide. What IS real: while the app is open (or
// briefly backgrounded on Android Chrome, which keeps service workers
// alive for a while), a genuine OS notification fires for anything
// newly due — not a fake toast, an actual notification the phone
// shows outside the browser.
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  if (Notification.permission === 'granted' || Notification.permission === 'denied') return Notification.permission
  return Notification.requestPermission()
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission
}

export async function showReminderNotification(title: string, body: string, tag: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready
      await reg.showNotification(title, { body, tag, icon: '/icon-192.png', badge: '/icon-192.png', dir: 'rtl', lang: 'fa' } as NotificationOptions)
    } else {
      new Notification(title, { body, tag })
    }
  } catch { /* notification failed silently — non-critical */ }
}

const NOTIFIED_KEY = 'minadent-notified-reminder-ids'

function getNotifiedIds(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(NOTIFIED_KEY) || '[]')) } catch { return new Set() }
}
function saveNotifiedIds(ids: Set<string>) {
  // Keep the set from growing forever — only the most recent 200 IDs matter.
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify(Array.from(ids).slice(-200)))
}

/** Fires a real notification for any reminder id not already notified
 * today, then marks it notified so re-opening the app doesn't spam
 * the same alert repeatedly. */
export function notifyOnceForReminder(id: string, title: string, body: string) {
  const notified = getNotifiedIds()
  const key = `${id}:${new Date().toISOString().slice(0, 10)}`
  if (notified.has(key)) return
  showReminderNotification(title, body, id)
  notified.add(key)
  saveNotifiedIds(notified)
}
