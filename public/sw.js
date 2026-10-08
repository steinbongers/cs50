/* Service worker: pushmeldingen en tik-op-melding. Geen caching van data. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Er ligt iets voor je klaar";
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-72.png",
    tag: data.tag || "finance-app",
    renotify: false,
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

/** Meet dat een melding geopend is. Mislukken mag nooit de navigatie hinderen. */
function reportPushOpened(tag) {
  return fetch("/api/events/push-opened", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tag }),
  }).catch(() => {});
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  const tag = event.notification.tag || "";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        const client = list.find((c) => "focus" in c);
        if (!client) return self.clients.openWindow(url);
        return client
          .focus()
          .then((focused) => (focused && "navigate" in focused ? focused.navigate(url) : null))
          .catch(() => self.clients.openWindow(url));
      })
      .catch(() => null)
      .then(() => reportPushOpened(tag)),
  );
});
