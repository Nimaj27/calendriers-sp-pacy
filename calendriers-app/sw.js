// ============================================================
// sw.js — Service Worker PWA
// Amicale SP Pacy-sur-Eure — Tournée Calendriers
// ============================================================

const CACHE_NAME = "sp-calendriers-v1";

// Fichiers mis en cache pour fonctionnement hors-ligne de base
const ASSETS = [
  "/",
  "/index.html",
  "/css/style.css",
  "/js/app.js",
  "/js/firebase.js",
  "/js/tournee.js",
  "/js/secteurs.js",
  "/manifest.json",
  "/assets/logo.png",
  // Google Fonts (best-effort)
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
];

// ── Install : mise en cache des ressources statiques ─────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS.map(url => new Request(url, { mode: "no-cors" })))
        .catch(() => {}); // Ne pas bloquer si certains assets manquent
    })
  );
  self.skipWaiting();
});

// ── Activate : purger les anciens caches ──────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch : network-first pour Firebase, cache-first pour assets ──
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Firebase / APIs → network only (pas de cache)
  if (
    url.hostname.includes("firebase") ||
    url.hostname.includes("googleapis") ||
    url.hostname.includes("gstatic") ||
    url.hostname.includes("google")
  ) {
    event.respondWith(fetch(event.request).catch(() => new Response("", { status: 503 })));
    return;
  }

  // Assets statiques → cache-first avec fallback réseau
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Mettre en cache la réponse si OK
        if (response && response.status === 200 && response.type !== "opaqueredirect") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Fallback offline : retourner index.html pour la navigation
        if (event.request.mode === "navigate") {
          return caches.match("/index.html");
        }
      });
    })
  );
});
