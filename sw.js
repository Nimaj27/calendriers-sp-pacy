// Service Worker — Amicale SP Pacy-sur-Eure
const CACHE_NAME = "sp-calendriers-v9";

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-192.png",
  "./icons/icon-180.png",
  "./icons/favicon-32.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => Promise.allSettled(ASSETS.map(u => c.add(u))))
      .catch(() => {})
  );
  // Pas de skipWaiting ici : la nouvelle version attend que l'utilisateur
  // accepte la mise à jour (message ACTIVER_MAINTENANT).
});

// Prise de contrôle immédiate à la demande de la page
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "ACTIVER_MAINTENANT") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // Firebase, Google et les tuiles de carte : toujours par le réseau
  if (url.hostname.includes("firebase") || url.hostname.includes("gstatic")
      || url.hostname.includes("google") || url.hostname.includes("tile.openstreetmap")
      || url.hostname.includes("geopf") || url.hostname.includes("jsdelivr")
      || url.hostname.includes("cdnjs")) {
    return;
  }
  // Ressources de l'app : réseau d'abord, cache en secours (mode hors-ligne)
  event.respondWith(
    fetch(event.request)
      .then(rep => {
        if (rep && rep.status === 200 && event.request.method === "GET") {
          const copie = rep.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, copie)).catch(()=>{});
        }
        return rep;
      })
      .catch(() => caches.match(event.request).then(r => r || caches.match("./index.html")))
  );
});
