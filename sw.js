const CACHE = "jinri-todos-v18";
const ASSETS = [
  "./",
  "index.html",
  "overlay.html",
  "app.js",
  "styles.css",
  "overlay.css",
  "manifest.json",
  "icon.svg",
  "apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png"
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("message", (e) => {
  const data = e.data || {};
  if (data.type !== "nag") return;
  e.waitUntil(
    self.registration.showNotification(data.title || "小鲨在催你", {
      body: data.body || "还有没做完的待办",
      icon: "./apple-touch-icon.png",
      badge: "./icons/icon-192.png",
      tag: "jinri-pet",
      renotify: true,
      data: { url: "./" },
    })
  );
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "./";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const hit = list.find((c) => c.url && "focus" in c);
      if (hit) return hit.focus();
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match("./index.html")))
  );
});
