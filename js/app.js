// ============================================================
// app.js — Routing, authentification, navigation principale
// Amicale SP Pacy-sur-Eure — Tournée Calendriers
// ============================================================


// ── État global de session ────────────────────────────────────
window.APP = {
  role:      null,   // "admin" | "equipier"
  user:      null,   // objet Firebase Auth (admin) ou objet équipe (equipier)
  equipeId:  null,
  equipeNom: null,
  // Désabonnements Firestore temps réel
  unsubs: []
};

// ── Utilitaires DOM ───────────────────────────────────────────
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const show = (...els) => els.forEach(e => e && e.classList.remove("hidden"));
const hide = (...els) => els.forEach(e => e && e.classList.add("hidden"));

function toast(msg, type = "info") {
  const t = document.createElement("div");
  t.className = `toast toast--${type}`;
  t.textContent = msg;
  document.getElementById("toasts").appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

function setLoading(btn, loading) {
  if (!btn) return;
  if (loading) { btn.dataset.orig = btn.textContent; btn.textContent = "…"; btn.disabled = true; }
  else { btn.textContent = btn.dataset.orig || btn.textContent; btn.disabled = false; }
}

function formatMontant(val) {
  return Number(val || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 }) + " €";
}

// ── Badge état réseau (hors-ligne / synchro) ──────────────────
function renderNetworkBadge() {
  return `<span id="network-badge" class="network-badge ${isOnline() ? 'network-badge--online' : 'network-badge--offline'}">${isOnline() ? '🟢 En ligne' : '🔴 Hors-ligne'}</span>`;
}

function bindNetworkBadge() {
  const badge = document.getElementById("network-badge");
  if (!badge) return () => {};
  return onNetworkChange((online) => {
    const b = document.getElementById("network-badge");
    if (!b) return;
    b.textContent = online ? '🟢 En ligne' : '🔴 Hors-ligne';
    b.className = `network-badge ${online ? 'network-badge--online' : 'network-badge--offline'}`;
    if (online) toast("Connexion rétablie — synchronisation en cours…", "success");
    else toast("Mode hors-ligne — tes saisies seront synchronisées au retour du réseau", "info");
  });
}

function stopUnsubs() {
  APP.unsubs.forEach(fn => fn && fn());
  APP.unsubs = [];
}

// ── Routing par hash ──────────────────────────────────────────
const ROUTES = {
  "#login":              renderLogin,
  "#dashboard":          renderDashboard,
  "#secteurs":           renderSecteurs,
  "#equipes":            renderEquipes,
  "#passages":           renderPassages,
  "#relances":           renderRelances,
  "#historique":         renderHistorique,
  "#classement":         renderClassement,
  "#config":             renderConfig,
  "#terrain":            renderTerrain,
  "#terrain-passages":   renderTerrainPassages
};

function naviguer(hash) {
  window.location.hash = hash;
}

window.addEventListener("hashchange", () => {
  const hash = window.location.hash || "#login";
  const fn   = ROUTES[hash];
  if (fn) fn();
  else renderLogin();
});

// ── Bootstrap ─────────────────────────────────────────────────
// Gérer le retour de redirection Google Auth
getLoginRedirect().then(async (result) => {
  if (result?.user) {
    const admin = await isAdmin(result.user.email);
    if (!admin) {
      toast("Accès refusé : email non autorisé", "error");
      await logoutGoogle();
    }
    // onAuth prend le relais pour router
  }
}).catch((e) => {
  if (e?.code !== "auth/no-auth-event") {
    console.warn("Redirect result error:", e?.message);
  }
});

onAuth(async (user) => {
  console.log("onAuth fired, user:", user?.email || "null");

  // Vérifier session PIN équipier en premier (indépendant de Google Auth)
  const sessionEquipe = sessionStorage.getItem("equipe");
  if (sessionEquipe && !user) {
    const eq = JSON.parse(sessionEquipe);
    APP.role = "equipier";
    APP.user = eq;
    APP.equipeId  = eq.id;
    APP.equipeNom = eq.nom;
    naviguer("#terrain");
    return;
  }

  if (user) {
    console.log("Checking admin for:", user.email);
    try {
      const admin = await isAdmin(user.email);
      console.log("isAdmin result:", admin);
      if (admin) {
        APP.role = "admin";
        APP.user = user;
        const hash = window.location.hash;
        naviguer(ROUTES[hash] && hash !== "#login" ? hash : "#dashboard");
        return;
      }
      // Pas admin → toast + déconnexion
      toast("Accès refusé. Vérifie que ton email est dans la collection admins Firestore.", "error");
      console.error("Email non admin:", user.email);
      await logoutGoogle();
    } catch(e) {
      console.error("Erreur isAdmin:", e);
      toast("Erreur de vérification admin : " + e.message, "error");
      await logoutGoogle();
    }
  }

  naviguer("#login");
});

// ════════════════════════════════════════════════════════════
//  PAGE LOGIN
// ════════════════════════════════════════════════════════════

function renderLogin() {
  stopUnsubs();
  const main = document.getElementById("main");
  main.innerHTML = `
    <div class="login-wrap">
      <div class="login-card">
        <div class="login-logo">
          <img src="data:image/png;base64,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" alt="SP Pacy" style="width:64px;height:64px;object-fit:contain;border-radius:50%;">
          <div class="login-logo-text">
            <span class="login-logo-title">Tournée Calendriers</span>
            <span class="login-logo-sub">Amicale SP Pacy-sur-Eure</span>
          </div>
        </div>

        <div class="login-tabs">
          <button class="tab-btn tab-btn--active" data-tab="admin">Chef d'amicale</button>
          <button class="tab-btn" data-tab="equipier">Équipier</button>
        </div>

        <!-- Onglet Admin -->
        <div id="tab-admin" class="tab-panel">
          <p class="login-hint">Connecte-toi avec ton compte Google autorisé.</p>
          <button id="btn-google" class="btn btn--primary btn--full">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Connexion Google
          </button>
        </div>

        <!-- Onglet Équipier -->
        <div id="tab-equipier" class="tab-panel hidden">
          <p class="login-hint">Saisis le code PIN de ton équipe (4 chiffres).</p>
          <div class="pin-display" id="pin-display">____</div>
          <div class="pin-pad">
            ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(k => `
              <button class="pin-key ${k === '' ? 'pin-key--empty' : ''}" data-key="${k}">${k}</button>
            `).join('')}
          </div>
          <div id="pin-error" class="error-msg hidden">Code PIN incorrect</div>
        </div>
      </div>
    </div>
  `;
  bindLoginEvents();
}

function bindLoginEvents() {
  // Tabs
  $$(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      $$(".tab-btn").forEach(b => b.classList.remove("tab-btn--active"));
      btn.classList.add("tab-btn--active");
      const tab = btn.dataset.tab;
      $$(".tab-panel").forEach(p => p.classList.add("hidden"));
      document.getElementById(`tab-${tab}`).classList.remove("hidden");
    });
  });

  // Google — signInWithPopup
  const btnGoogle = document.getElementById("btn-google");
  if (btnGoogle) {
    btnGoogle.addEventListener("click", async () => {
      setLoading(btnGoogle, true);
      try {
        const result = await loginGoogle();
        if (result?.user) {
          const admin = await isAdmin(result.user.email);
          if (admin) {
            APP.role = "admin";
            APP.user = result.user;
            naviguer("#dashboard");
          } else {
            toast("Accès refusé : " + result.user.email + " n\'est pas administrateur.", "error");
            await logoutGoogle();
            setLoading(btnGoogle, false);
          }
        }
      } catch (e) {
        if (e.code !== "auth/popup-closed-by-user") {
          toast("Erreur de connexion : " + e.message, "error");
        }
        setLoading(btnGoogle, false);
      }
    });
  }

  // PIN
  let pinSaisi = "";
  function updatePinDisplay() {
    const display = document.getElementById("pin-display");
    if (!display) return;
    display.textContent = pinSaisi.padEnd(4, "_");
  }

  $$(".pin-key").forEach(btn => {
    btn.addEventListener("click", async () => {
      const key = btn.dataset.key;
      if (key === "⌫") {
        pinSaisi = pinSaisi.slice(0, -1);
        updatePinDisplay();
        return;
      }
      if (key === "") return;
      if (pinSaisi.length >= 4) return;
      pinSaisi += key;
      updatePinDisplay();

      if (pinSaisi.length === 4) {
        const errEl = document.getElementById("pin-error");
        try {
          const equipe = await loginPin(pinSaisi);
          if (equipe) {
            APP.role = "equipier";
            APP.user = equipe;
            APP.equipeId  = equipe.id;
            APP.equipeNom = equipe.nom;
            sessionStorage.setItem("equipe", JSON.stringify(equipe));
            naviguer("#terrain");
          } else {
            errEl && errEl.classList.remove("hidden");
            pinSaisi = "";
            updatePinDisplay();
            setTimeout(() => errEl && errEl.classList.add("hidden"), 2500);
          }
        } catch(e) {
          toast("Erreur : " + e.message, "error");
          pinSaisi = "";
          updatePinDisplay();
        }
      }
    });
  });
}

// ════════════════════════════════════════════════════════════
//  LAYOUT ADMIN (shared)
// ════════════════════════════════════════════════════════════

function layoutAdmin(activeHash, content) {
  const nav = [
    { hash: "#dashboard", icon: "📊", label: "Tableau de bord" },
    { hash: "#secteurs",  icon: "🗺️", label: "Secteurs" },
    { hash: "#equipes",   icon: "👥", label: "Équipes" },
    { hash: "#passages",  icon: "📋", label: "Passages" },
    { hash: "#relances",  icon: "🔔", label: "Relances" },
    { hash: "#historique", icon: "📅", label: "Historique" },
    { hash: "#classement", icon: "🏆", label: "Classement" },
    { hash: "#config",    icon: "⚙️",  label: "Config" }
  ];
  return `
    <div class="admin-layout">
      <header class="mobile-topbar">
        <button id="btn-menu-toggle" class="btn-hamburger" aria-label="Menu">☰</button>
        <span class="mobile-topbar-title">SP Pacy</span>
      </header>
      <div id="sidebar-overlay" class="sidebar-overlay hidden"></div>
      <nav class="sidebar" id="sidebar">
        <div class="sidebar-brand">
          <img src="data:image/png;base64,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" alt="SP Pacy" style="width:36px;height:36px;object-fit:contain;border-radius:50%;flex-shrink:0;">
          <span class="sidebar-title">SP Pacy<br><small>Tournée Calendriers</small></span>
        </div>
        <ul class="sidebar-nav">
          ${nav.map(n => `
            <li>
              <a href="${n.hash}" class="sidebar-link ${activeHash === n.hash ? 'sidebar-link--active' : ''}">
                <span class="sidebar-link-icon">${n.icon}</span>
                <span>${n.label}</span>
              </a>
            </li>
          `).join('')}
        </ul>
        <div class="sidebar-footer">
          <span class="sidebar-user">${APP.user?.email || ''}</span>
          <button id="btn-logout" class="btn btn--ghost btn--sm">Déconnexion</button>
        </div>
      </nav>
      <main class="admin-content">
        ${content}
      </main>
    </div>
  `;
}

function bindLogout() {
  document.getElementById("btn-logout")?.addEventListener("click", async () => {
    stopUnsubs();
    if (APP.role === "admin") await logoutGoogle();
    sessionStorage.removeItem("equipe");
    APP.role = null; APP.user = null; APP.equipeId = null; APP.equipeNom = null;
    naviguer("#login");
  });
  bindMobileMenu();
}

function bindMobileMenu() {
  const btn = document.getElementById("btn-menu-toggle");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  if (!btn || !sidebar || !overlay) return;

  const closeMenu = () => {
    sidebar.classList.remove("sidebar--open");
    overlay.classList.add("hidden");
  };
  const openMenu = () => {
    sidebar.classList.add("sidebar--open");
    overlay.classList.remove("hidden");
  };

  btn.addEventListener("click", () => {
    sidebar.classList.contains("sidebar--open") ? closeMenu() : openMenu();
  });
  overlay.addEventListener("click", closeMenu);
  // Fermer le menu après avoir cliqué un lien de navigation
  sidebar.querySelectorAll(".sidebar-link").forEach(link => {
    link.addEventListener("click", closeMenu);
  });
}

// ════════════════════════════════════════════════════════════
//  DASHBOARD ADMIN
// ════════════════════════════════════════════════════════════

async function renderDashboard() {
  if (APP.role !== "admin") { naviguer("#login"); return; }
  stopUnsubs();

  document.getElementById("main").innerHTML = layoutAdmin("#dashboard", `
    <div class="page-header">
      <h1>Tableau de bord</h1>
      <button id="btn-export" class="btn btn--primary">⬇️ Exporter le bilan</button>
    </div>
    <div id="dashboard-content">
      <div class="loader">Chargement…</div>
    </div>
    <div class="section-block">
      <h2>Carte des secteurs</h2>
      <div id="dashboard-map" style="height:420px;border-radius:12px;overflow:hidden;"></div>
      <div id="map-legend" class="map-legend">
        <span><i style="background:#9CA3AF"></i> Non affecté</span>
      </div>
    </div>
  `);
  bindLogout();

  // Initialiser la carte
  let dashboardMap = null;
  initCarte("dashboard-map", { zoom: 11 }).then(map => { dashboardMap = map; refreshCarte(); });

  async function refreshCarte() {
    if (!dashboardMap) return;
    const [secteurs, equipes] = await Promise.all([lireSecteurs(), lireEquipes()]);
    // Nettoyer les anciennes couches
    dashboardMap.eachLayer(l => { if (l.options && l.options.attribution === undefined) dashboardMap.removeLayer(l); });
    // Recréer le fond de carte si besoin
    if (!dashboardMap._hasTileLayer) {
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors', maxZoom: 19 }).addTo(dashboardMap);
      dashboardMap._hasTileLayer = true;
    }
    await afficherSecteursSurCarte(dashboardMap, secteurs, equipes);

    // Légende dynamique : une couleur par équipe
    const legend = document.getElementById("map-legend");
    if (legend) {
      legend.innerHTML = `<span><i style="background:#9CA3AF"></i> Non affecté</span>` +
        equipes.map((eq, i) => `<span><i style="background:${PALETTE_EQUIPES[equipes.map(e=>e.id).sort().indexOf(eq.id) % PALETTE_EQUIPES.length]}"></i> ${eq.nom}</span>`).join('');
    }
  }

  document.getElementById("btn-export")?.addEventListener("click", async () => {
    try {
      const csv = await exporterBilanCSV();
      const date = new Date().toISOString().slice(0,10);
      telechargerCSV(csv, `bilan-tournee-${date}.csv`);
      toast("Export téléchargé !", "success");
    } catch(e) { toast("Erreur export : " + e.message, "error"); }
  });

  async function refreshDashboard() {
    const stats = await statsGlobalesTournee();
    const secteursActuels = await lireSecteurs();
    const passagesActuels = await fsGetAll(COLLECTIONS.PASSAGES);
    const content = document.getElementById("dashboard-content");
    if (!content) return;

    const badgesParEquipe = calculerBadges(stats.parEquipe, secteursActuels, passagesActuels);

    // Détection de nouveaux déblocages (comparaison avec le cache précédent)
    if (APP._badgesCache) {
      const nouveaux = detecterNouveauxBadges(APP._badgesCache, badgesParEquipe);
      nouveaux.forEach(({ equipeId, badge }) => {
        const eq = stats.parEquipe.find(e => e.id === equipeId);
        if (eq) toast(`🎉 ${eq.nom} a débloqué le badge ${badge.icone} ${badge.nom} !`, "success");
      });
    }
    APP._badgesCache = badgesParEquipe;

    content.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card stat-card--primary">
          <div class="stat-value">${formatMontant(stats.totalCollecte)}</div>
          <div class="stat-label">Total collecté</div>
          <div class="stat-sub">💵 ${formatMontant(stats.totalEspeces)} | 📝 ${formatMontant(stats.totalCheques)} | 💳 ${formatMontant(stats.totalCarte)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.avancement}%</div>
          <div class="stat-label">Avancement</div>
          <div class="progress-bar"><div class="progress-fill" style="width:${stats.avancement}%"></div></div>
          <div class="stat-sub">${stats.nbSecteursTermines} / ${stats.nbSecteursTotal} secteurs terminés</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.nbDons}</div>
          <div class="stat-label">Dons reçus</div>
          <div class="stat-sub">🚫 ${stats.nbRefus} refus | 🔔 ${stats.nbRelances} à relancer</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.nbPassages}</div>
          <div class="stat-label">Foyers visités</div>
          <div class="stat-sub">🔁 ${stats.nbAbsents} absents</div>
        </div>
      </div>

      <div class="section-block">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <h2 style="margin:0;">Classement des équipes</h2>
          <a href="#classement" class="btn btn--sm btn--ghost">🏆 Voir le podium complet</a>
        </div>
        <div class="equipes-ranking-grid">
          ${stats.parEquipe.map((eq, i) => {
            const pct = pourcentCompletionEquipe(eq.id, secteursActuels);
            const palier = getPalier(pct);
            const badges = badgesParEquipe[eq.id] || [];
            return `
            <div class="ranking-card">
              <div class="ranking-card-top">
                <span class="ranking-pos">#${i+1}</span>
                <span class="ranking-nom">${eq.nom}</span>
                <span class="ranking-palier" title="${palier.label} — ${pct}% des secteurs terminés">${palier.icone}</span>
              </div>
              <div class="ranking-montant">${formatMontant(eq.montant)}</div>
              <div class="ranking-bar-wrap">
                <div class="ranking-bar" style="width:${stats.totalCollecte > 0 ? Math.round(eq.montant/stats.totalCollecte*100) : 0}%"></div>
              </div>
              <div class="ranking-sub">${eq.nbPassages} passage(s) · ${pct}% du secteur</div>
              ${badges.length > 0 ? `<div class="ranking-badges">${badges.map(b => `<span title="${b.nom} — ${b.description}">${b.icone}</span>`).join('')}</div>` : ''}
            </div>
          `}).join('')}
        </div>
      </div>
    `;
  }

  await refreshDashboard();
  await refreshCarte();

  // Écoute temps réel sur secteurs → rafraîchit les stats + carte
  const unsub = ecouterSecteurs(async () => { await refreshDashboard(); await refreshCarte(); });
  APP.unsubs.push(unsub);
}

// ════════════════════════════════════════════════════════════
//  SECTEURS
// ════════════════════════════════════════════════════════════

async function renderSecteurs() {
  if (APP.role !== "admin") { naviguer("#login"); return; }
  stopUnsubs();

  document.getElementById("main").innerHTML = layoutAdmin("#secteurs", `
    <div class="page-header">
      <h1>Secteurs géographiques</h1>
      <div style="display:flex; gap:8px;">
        <button id="btn-import-csv" class="btn btn--ghost">📥 Importer CSV</button>
        <button id="btn-add-secteur" class="btn btn--primary">+ Nouveau secteur</button>
      </div>
    </div>
    <div class="filter-bar">
      <input id="search-secteur" class="input input--sm" placeholder="🔍 Rechercher une commune ou un secteur…" style="max-width:320px;">
    </div>
    <div id="secteurs-list"><div class="loader">Chargement…</div></div>
    <div id="modal-secteur" class="modal hidden"></div>
    <input type="file" id="input-csv" accept=".csv" class="hidden">
  `);
  bindLogout();

  let _secteursCache = [];

  document.getElementById("search-secteur")?.addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    const filtered = q
      ? _secteursCache.filter(s =>
          s.commune.toLowerCase().includes(q) || s.nom.toLowerCase().includes(q))
      : _secteursCache;
    renderSecteursList(filtered);
  });

  document.getElementById("btn-add-secteur")?.addEventListener("click", () => showSecteurModal());

  document.getElementById("btn-import-csv")?.addEventListener("click", () => {
    document.getElementById("input-csv").click();
  });

  document.getElementById("input-csv")?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const headers = lines[0].split(',').map(h => h.trim());
    let created = 0, errors = 0;

    for (let i = 1; i < lines.length; i++) {
      // Parse CSV simple (gère les champs vides)
      const values = lines[i].split(',');
      const row = {};
      headers.forEach((h, idx) => row[h] = (values[idx] || '').trim());

      if (!row.nom || !row.commune) continue;

      try {
        await creerSecteur({
          nom: row.nom,
          commune: row.commune,
          description: row.description || '',
          rues: row.rues ? row.rues.split(';').map(r => r.trim()).filter(Boolean) : [],
          couleur: row.couleur || '#EF4444'
        });
        created++;
      } catch(err) {
        console.error('Erreur import ligne', i, err);
        errors++;
      }
    }
    toast(`Import terminé : ${created} secteur(s) créé(s)${errors ? `, ${errors} erreur(s)` : ''}`, errors ? "error" : "success");
    e.target.value = '';
  });

  const unsub = ecouterSecteurs((secteurs) => {
    _secteursCache = secteurs;
    const q = document.getElementById("search-secteur")?.value.trim().toLowerCase() || '';
    const filtered = q
      ? secteurs.filter(s => s.commune.toLowerCase().includes(q) || s.nom.toLowerCase().includes(q))
      : secteurs;
    renderSecteursList(filtered);
  });
  APP.unsubs.push(unsub);
}

function renderSecteursList(secteurs) {
  const list = document.getElementById("secteurs-list");
  if (!list) return;
  if (secteurs.length === 0) {
    const hasSearch = document.getElementById("search-secteur")?.value.trim();
    list.innerHTML = hasSearch
      ? `<p class="empty-state">Aucun secteur ne correspond à « ${hasSearch} ».</p>`
      : `<p class="empty-state">Aucun secteur. Commence par en créer un.</p>`;
    return;
  }
  const sorted = [...secteurs].sort((a, b) => (a.commune + a.nom).localeCompare(b.commune + b.nom));
  list.innerHTML = `
    <div class="secteurs-grid">
      ${sorted.map(s => `
        <div class="secteur-card secteur-card--${s.statut}" data-id="${s.id}">
          <div class="secteur-card-header">
            <span class="secteur-dot" style="background:${s.couleur || '#EF4444'}"></span>
            <strong>${s.nom}</strong>
            <span class="badge badge--${s.statut}">${STATUT_LABEL[s.statut]}</span>
          </div>
          <div class="secteur-card-body">
            <div class="secteur-commune-label">${s.commune}</div>
            <div class="secteur-equipe">${s.equipNom ? '👥 ' + s.equipNom : '— Non affecté'}</div>
            <div class="secteur-montant">${formatMontant(s.totalCollecte)}</div>
            ${s.rues?.length ? `<div class="secteur-rues">${s.rues.join(', ')}</div>` : ''}
          </div>
          <div class="secteur-card-actions">
            <button class="btn btn--sm btn--ghost" onclick="editSecteur('${s.id}')">✏️ Modifier</button>
            <button class="btn btn--sm btn--ghost" onclick="affecterSecteur('${s.id}')">👥 Affecter</button>
            ${s.statut !== 'termine' ? `<button class="btn btn--sm btn--ghost" onclick="clotureSecteur('${s.id}')">✅ Clôturer</button>` : ''}
            <button class="btn btn--sm btn--danger" onclick="deleteSecteur('${s.id}')">🗑️</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

window.editSecteur = async (id) => {
  const s = await lireSecteur(id);
  showSecteurModal(s);
};
window.deleteSecteur = async (id) => {
  if (!confirm("Supprimer ce secteur ? Tous ses passages seront orphelins.")) return;
  try { await supprimerSecteur(id); toast("Secteur supprimé", "success"); }
  catch(e) { toast(e.message, "error"); }
};
window.clotureSecteur = async (id) => {
  if (!confirm("Marquer ce secteur comme terminé ?")) return;
  try { await cloturerSecteur(id); toast("Secteur clôturé ✅", "success"); }
  catch(e) { toast(e.message, "error"); }
};
window.affecterSecteur = async (secteurId) => {
  const equipes = await lireEquipes();
  const modal = document.getElementById("modal-secteur");
  modal.innerHTML = `
    <div class="modal-inner">
      <h2>Affecter une équipe</h2>
      <select id="sel-equipe" class="input">
        <option value="">— Aucune (désaffecter) —</option>
        ${equipes.map(e => `<option value="${e.id}" data-nom="${e.nom}">${e.nom}</option>`).join('')}
      </select>
      <div class="modal-actions">
        <button id="btn-affecter" class="btn btn--primary">Confirmer</button>
        <button class="btn btn--ghost" onclick="closeModal()">Annuler</button>
      </div>
    </div>
  `;
  modal.classList.remove("hidden");
  document.getElementById("btn-affecter")?.addEventListener("click", async () => {
    const sel = document.getElementById("sel-equipe");
    const equipeId  = sel.value;
    const equipeNom = sel.options[sel.selectedIndex].dataset.nom || null;
    try {
      if (equipeId) await affecterEquipe(secteurId, equipeId, equipeNom);
      else await desaffecterEquipe(secteurId);
      toast("Affectation mise à jour ✅", "success");
      closeModal();
    } catch(e) { toast(e.message, "error"); }
  });
};

function showSecteurModal(secteur = null) {
  const modal = document.getElementById("modal-secteur");
  modal.innerHTML = `
    <div class="modal-inner">
      <h2>${secteur ? "Modifier le secteur" : "Nouveau secteur"}</h2>
      <label class="label">Nom du secteur *</label>
      <input id="s-nom" class="input" value="${secteur?.nom || ''}" placeholder="Ex: Centre-ville Nord">
      <label class="label">Commune *</label>
      <input id="s-commune" class="input" value="${secteur?.commune || ''}" placeholder="Ex: Pacy-sur-Eure">
      <label class="label">Description</label>
      <input id="s-desc" class="input" value="${secteur?.description || ''}" placeholder="Informations complémentaires">
      <label class="label">Rues / zones (une par ligne)</label>
      <textarea id="s-rues" class="input textarea" rows="4">${(secteur?.rues || []).join('\n')}</textarea>
      <label class="label">Couleur d'affichage</label>
      <input id="s-couleur" type="color" class="input input--color" value="${secteur?.couleur || '#EF4444'}">
      <div class="modal-actions">
        <button id="btn-save-secteur" class="btn btn--primary">${secteur ? "Enregistrer" : "Créer"}</button>
        <button class="btn btn--ghost" onclick="closeModal()">Annuler</button>
      </div>
    </div>
  `;
  modal.classList.remove("hidden");
  document.getElementById("btn-save-secteur")?.addEventListener("click", async () => {
    const nom      = document.getElementById("s-nom").value.trim();
    const commune  = document.getElementById("s-commune").value.trim();
    const description = document.getElementById("s-desc").value.trim();
    const rues     = document.getElementById("s-rues").value.split('\n').map(r => r.trim()).filter(Boolean);
    const couleur  = document.getElementById("s-couleur").value;
    if (!nom || !commune) { toast("Nom et commune obligatoires", "error"); return; }
    try {
      if (secteur) await mettreAJourSecteur(secteur.id, { nom, commune, description, rues, couleur });
      else await creerSecteur({ nom, commune, description, rues, couleur });
      toast(secteur ? "Secteur mis à jour ✅" : "Secteur créé ✅", "success");
      closeModal();
    } catch(e) { toast(e.message, "error"); }
  });
}

window.closeModal = () => {
  $$(".modal").forEach(m => m.classList.add("hidden"));
};

// ════════════════════════════════════════════════════════════
//  ÉQUIPES
// ════════════════════════════════════════════════════════════

async function renderEquipes() {
  if (APP.role !== "admin") { naviguer("#login"); return; }
  stopUnsubs();

  document.getElementById("main").innerHTML = layoutAdmin("#equipes", `
    <div class="page-header">
      <h1>Équipes</h1>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button id="btn-auto-affecter" class="btn btn--ghost">🔗 Affecter par nom</button>
        <button id="btn-import-csv-equipe" class="btn btn--ghost">📥 Importer CSV</button>
        <button id="btn-add-equipe" class="btn btn--primary">+ Nouvelle équipe</button>
      </div>
    </div>
    <div id="equipes-list"><div class="loader">Chargement…</div></div>
    <div id="modal-equipe" class="modal hidden"></div>
    <input type="file" id="input-csv-equipe" accept=".csv" class="hidden">
  `);
  bindLogout();

  document.getElementById("btn-add-equipe")?.addEventListener("click", () => showEquipeModal());

  document.getElementById("btn-auto-affecter")?.addEventListener("click", async () => {
    if (!confirm("Affecter automatiquement chaque secteur à l'équipe portant son nom (ex: secteur \"Chambray\" → équipe \"Équipe Chambray\") ?\n\nLes secteurs déjà affectés à une autre équipe seront écrasés s'il y a correspondance.")) return;

    const btn = document.getElementById("btn-auto-affecter");
    setLoading(btn, true);
    try {
      const [equipes, secteurs] = await Promise.all([lireEquipes(), lireSecteurs()]);

      // Normalise un nom pour matcher : minuscules, sans accents, sans "équipe "
      const normalize = (s) => s
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/^equipe\s+/i, "")
        .trim();

      const equipesParNom = {};
      equipes.forEach(eq => { equipesParNom[normalize(eq.nom)] = eq; });

      let affectes = 0, sansMatch = 0;
      for (const s of secteurs) {
        const match = equipesParNom[normalize(s.nom)];
        if (match) {
          await affecterEquipe(s.id, match.id, match.nom);
          affectes++;
        } else {
          sansMatch++;
        }
      }
      toast(`Affectation automatique : ${affectes} secteur(s) affecté(s)${sansMatch ? `, ${sansMatch} sans correspondance` : ''}`, "success");
    } catch(e) {
      toast("Erreur : " + e.message, "error");
    }
    setLoading(btn, false);
  });

  document.getElementById("btn-import-csv-equipe")?.addEventListener("click", () => {
    document.getElementById("input-csv-equipe").click();
  });

  document.getElementById("input-csv-equipe")?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const headers = lines[0].split(',').map(h => h.trim());
    let created = 0, errors = 0;

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const row = {};
      headers.forEach((h, idx) => row[h] = (values[idx] || '').trim());

      if (!row.nom || !row.pin) continue;

      try {
        await creerEquipe({
          nom: row.nom,
          pin: row.pin,
          membres: row.membres ? row.membres.split(';').map(m => m.trim()).filter(Boolean) : []
        });
        created++;
      } catch(err) {
        console.error('Erreur import ligne', i, err);
        errors++;
      }
    }
    toast(`Import terminé : ${created} équipe(s) créée(s)${errors ? `, ${errors} erreur(s)` : ''}`, errors ? "error" : "success");
    e.target.value = '';
  });

  const unsub = ecouterEquipes(renderEquipesList);
  APP.unsubs.push(unsub);
}

function renderEquipesList(equipes) {
  const list = document.getElementById("equipes-list");
  if (!list) return;
  if (equipes.length === 0) {
    list.innerHTML = `<p class="empty-state">Aucune équipe. Commence par en créer une.</p>`;
    return;
  }
  list.innerHTML = `
    <div class="table-wrap">
      <table class="table">
        <thead><tr><th>Équipe</th><th>PIN</th><th>Membres</th><th>Actions</th></tr></thead>
        <tbody>
          ${equipes.map(e => `
            <tr>
              <td><strong>${e.nom}</strong></td>
              <td><code class="pin-code">${e.pin}</code></td>
              <td>${(e.membres || []).join(', ') || '—'}</td>
              <td class="td-actions">
                <button class="btn btn--sm btn--ghost" onclick="editEquipe('${e.id}')">✏️</button>
                <button class="btn btn--sm btn--danger" onclick="deleteEquipe('${e.id}')">🗑️</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

window.editEquipe = async (id) => {
  const equipes = await lireEquipes();
  const eq = equipes.find(e => e.id === id);
  showEquipeModal(eq);
};
window.deleteEquipe = async (id) => {
  if (!confirm("Supprimer cette équipe ?")) return;
  try { await supprimerEquipe(id); toast("Équipe supprimée", "success"); }
  catch(e) { toast(e.message, "error"); }
};

function showEquipeModal(equipe = null) {
  const modal = document.getElementById("modal-equipe");
  modal.innerHTML = `
    <div class="modal-inner">
      <h2>${equipe ? "Modifier l'équipe" : "Nouvelle équipe"}</h2>
      <label class="label">Nom de l'équipe *</label>
      <input id="e-nom" class="input" value="${equipe?.nom || ''}" placeholder="Ex: Équipe Alpha">
      <label class="label">Code PIN (4 chiffres) *</label>
      <input id="e-pin" class="input" maxlength="4" inputmode="numeric" value="${equipe?.pin || ''}" placeholder="0000">
      <label class="label">Membres (un par ligne)</label>
      <textarea id="e-membres" class="input textarea" rows="5">${(equipe?.membres || []).join('\n')}</textarea>
      <div class="modal-actions">
        <button id="btn-save-equipe" class="btn btn--primary">${equipe ? "Enregistrer" : "Créer"}</button>
        <button class="btn btn--ghost" onclick="closeModal()">Annuler</button>
      </div>
    </div>
  `;
  modal.classList.remove("hidden");
  document.getElementById("btn-save-equipe")?.addEventListener("click", async () => {
    const nom     = document.getElementById("e-nom").value.trim();
    const pin     = document.getElementById("e-pin").value.trim();
    const membres = document.getElementById("e-membres").value.split('\n').map(m => m.trim()).filter(Boolean);
    try {
      if (equipe) await mettreAJourEquipe(equipe.id, { nom, pin, membres });
      else await creerEquipe({ nom, pin, membres });
      toast(equipe ? "Équipe mise à jour ✅" : "Équipe créée ✅", "success");
      closeModal();
    } catch(e) { toast(e.message, "error"); }
  });
}

// ════════════════════════════════════════════════════════════
//  PASSAGES (vue admin)
// ════════════════════════════════════════════════════════════

async function renderPassages() {
  if (APP.role !== "admin") { naviguer("#login"); return; }
  stopUnsubs();

  const secteurs = await lireSecteurs();

  document.getElementById("main").innerHTML = layoutAdmin("#passages", `
    <div class="page-header"><h1>Passages</h1></div>
    <div class="filter-bar">
      <select id="filter-secteur" class="input input--sm">
        <option value="">Tous les secteurs</option>
        ${secteurs.map(s => `<option value="${s.id}">${s.commune} – ${s.nom}</option>`).join('')}
      </select>
    </div>
    <div id="passages-list"><div class="loader">Chargement…</div></div>
  `);
  bindLogout();

  async function loadPassages() {
    const secteurId = document.getElementById("filter-secteur")?.value;
    let passages;
    if (secteurId) {
      passages = await passagesDuSecteur(secteurId);
    } else {
      passages = await fsGetAll(COLLECTIONS.PASSAGES);
      passages.sort((a,b) => (b.datePassage || "").localeCompare(a.datePassage || ""));
    }
    renderPassagesList(passages, secteurs);
  }

  document.getElementById("filter-secteur")?.addEventListener("change", loadPassages);
  await loadPassages();
}

function renderPassagesList(passages, secteurs) {
  const list = document.getElementById("passages-list");
  if (!list) return;
  const secteurMap = Object.fromEntries((secteurs || []).map(s => [s.id, s]));
  if (passages.length === 0) {
    list.innerHTML = `<p class="empty-state">Aucun passage enregistré.</p>`;
    return;
  }
  list.innerHTML = `
    <div class="table-wrap">
      <table class="table">
        <thead><tr><th>Date</th><th>Équipe</th><th>Secteur</th><th>Adresse</th><th>Statut</th><th>Montant</th><th>Mode</th></tr></thead>
        <tbody>
          ${passages.map(p => {
            const s = secteurMap[p.secteurId] || {};
            return `<tr class="tr--${p.statut}">
              <td>${(p.datePassage || '').slice(0,10)}</td>
              <td>${p.equipeNom || '—'}</td>
              <td>${s.nom || '—'}</td>
              <td>${p.adresse || '—'}</td>
              <td><span class="badge badge--${p.statut}">${STATUT_PASSAGE_LABEL[p.statut] || p.statut}</span></td>
              <td>${p.statut === 'don' ? formatMontant(p.montant) : '—'}</td>
              <td>${p.modePaiement || '—'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ════════════════════════════════════════════════════════════
//  RELANCES
// ════════════════════════════════════════════════════════════

async function renderRelances() {
  if (APP.role !== "admin") { naviguer("#login"); return; }
  stopUnsubs();

  document.getElementById("main").innerHTML = layoutAdmin("#relances", `
    <div class="page-header"><h1>Foyers à relancer</h1></div>
    <div id="relances-list"><div class="loader">Chargement…</div></div>
  `);
  bindLogout();

  const passages  = await foyersARelancer();
  const secteurs  = await lireSecteurs();
  const secteurMap = Object.fromEntries(secteurs.map(s => [s.id, s]));

  const list = document.getElementById("relances-list");
  if (!list) return;
  if (passages.length === 0) {
    list.innerHTML = `<p class="empty-state">🎉 Aucun foyer à relancer !</p>`;
    return;
  }
  list.innerHTML = `
    <p class="relances-count">${passages.length} foyer(s) à relancer</p>
    <div class="table-wrap">
      <table class="table">
        <thead><tr><th>Équipe</th><th>Secteur</th><th>Commune</th><th>Adresse</th><th>Note</th></tr></thead>
        <tbody>
          ${passages.map(p => {
            const s = secteurMap[p.secteurId] || {};
            return `<tr>
              <td>${p.equipeNom || '—'}</td>
              <td>${s.nom || '—'}</td>
              <td>${s.commune || '—'}</td>
              <td>${p.adresse || '—'}</td>
              <td>${p.note || '—'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ════════════════════════════════════════════════════════════
//  HISTORIQUE MULTI-ANNÉES
// ════════════════════════════════════════════════════════════

async function renderHistorique() {
  if (APP.role !== "admin") { naviguer("#login"); return; }
  stopUnsubs();

  document.getElementById("main").innerHTML = layoutAdmin("#historique", `
    <div class="page-header">
      <h1>Historique des tournées</h1>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button id="btn-saisie-manuelle" class="btn btn--ghost">✍️ Saisir une saison passée</button>
        <button id="btn-archiver-saison" class="btn btn--primary">📦 Archiver la saison en cours</button>
      </div>
    </div>
    <div id="historique-content"><div class="loader">Chargement…</div></div>
    <div id="modal-historique" class="modal hidden"></div>
  `);
  bindLogout();

  document.getElementById("btn-saisie-manuelle")?.addEventListener("click", () => showSaisieManuelleModal());
  document.getElementById("btn-archiver-saison")?.addEventListener("click", () => showArchiverModal());

  await chargerHistorique();
}

async function chargerHistorique() {
  const content = document.getElementById("historique-content");
  if (!content) return;
  content.innerHTML = `<div class="loader">Chargement…</div>`;

  const saisons = await lireToutesLesSaisons();

  if (saisons.length === 0) {
    content.innerHTML = `
      <p class="empty-state">
        Aucune saison archivée pour le moment.<br>
        Utilise "Saisir une saison passée" pour intégrer les données récupérées auprès de l'amicale,
        ou "Archiver la saison en cours" en fin de tournée actuelle.
      </p>
    `;
    return;
  }

  content.innerHTML = `
    <div class="section-block">
      <h2>Comparer deux saisons</h2>
      <div class="filter-bar">
        <select id="sel-saison-a" class="input input--sm">
          ${saisons.map(s => `<option value="${s.annee}">${s.annee}</option>`).join('')}
        </select>
        <span style="align-self:center;">vs</span>
        <select id="sel-saison-b" class="input input--sm">
          ${saisons.map((s, i) => `<option value="${s.annee}" ${i === 1 ? 'selected' : ''}>${s.annee}</option>`).join('')}
        </select>
        <button id="btn-comparer" class="btn btn--primary btn--sm">Comparer</button>
      </div>
      <div id="comparaison-result"></div>
    </div>

    <div class="section-block">
      <h2>Saisons archivées</h2>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Année</th><th>Total collecté</th><th>Dons</th><th>Secteurs</th><th>Source</th><th>Actions</th></tr></thead>
          <tbody>
            ${saisons.map(s => `
              <tr>
                <td><strong>${s.annee}</strong></td>
                <td>${formatMontant(s.totalCollecte)}</td>
                <td>${s.nbDons}</td>
                <td>${s.nbSecteursTermines}/${s.nbSecteursTotal}</td>
                <td>${s.saisieManuelle ? '✍️ Manuelle' : '📦 Archivée'}</td>
                <td class="td-actions">
                  <button class="btn btn--sm btn--ghost" onclick="voirDetailSaison(${s.annee})">👁️ Détail</button>
                  <button class="btn btn--sm btn--danger" onclick="supprimerSaisonConfirm(${s.annee})">🗑️</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById("btn-comparer")?.addEventListener("click", async () => {
    const anneeA = document.getElementById("sel-saison-a").value;
    const anneeB = document.getElementById("sel-saison-b").value;
    if (anneeA === anneeB) { toast("Choisis deux années différentes", "error"); return; }

    const [saisonA, saisonB] = await Promise.all([lireSaison(anneeA), lireSaison(anneeB)]);
    const comp = comparerSaisons(saisonA, saisonB);
    afficherComparaison(comp);
  });
}

function afficherComparaison(comp) {
  const el = document.getElementById("comparaison-result");
  if (!el || !comp) return;

  const tendanceIcon = (t) => t === "hausse" ? "📈" : t === "baisse" ? "📉" : t === "nouveau" ? "🆕" : "➡️";
  const tendanceColor = (t) => t === "hausse" ? "var(--vert)" : t === "baisse" ? "var(--rouge)" : "var(--ardoise-mid)";

  el.innerHTML = `
    <div class="comparaison-summary">
      <div class="comparaison-total">
        <span class="comparaison-annee">${comp.anneeA}</span>
        <span class="comparaison-montant">${formatMontant(comp.totalA)}</span>
      </div>
      <div class="comparaison-ecart" style="color:${comp.ecartTotal >= 0 ? 'var(--vert)' : 'var(--rouge)'}">
        ${comp.ecartTotal >= 0 ? '+' : ''}${formatMontant(comp.ecartTotal)}
        ${comp.ecartPourcent !== null ? `(${comp.ecartPourcent >= 0 ? '+' : ''}${comp.ecartPourcent}%)` : ''}
      </div>
      <div class="comparaison-total">
        <span class="comparaison-annee">${comp.anneeB}</span>
        <span class="comparaison-montant">${formatMontant(comp.totalB)}</span>
      </div>
    </div>

    <h3 class="comparaison-subtitle">Par secteur</h3>
    <div class="table-wrap">
      <table class="table">
        <thead><tr><th>Secteur</th><th>${comp.anneeA}</th><th>${comp.anneeB}</th><th>Écart</th></tr></thead>
        <tbody>
          ${comp.comparaisonSecteurs.map(s => `
            <tr>
              <td>${s.nom}<br><small style="color:var(--ardoise-mid)">${s.commune}</small></td>
              <td>${formatMontant(s.montantA)}</td>
              <td>${s.montantB !== null ? formatMontant(s.montantB) : '—'}</td>
              <td style="color:${tendanceColor(s.tendance)};font-weight:600;">
                ${tendanceIcon(s.tendance)} ${s.ecart !== null ? (s.ecart >= 0 ? '+' : '') + formatMontant(s.ecart) : 'Nouveau'}
                ${s.ecartPct !== null ? ` (${s.ecartPct >= 0 ? '+' : ''}${s.ecartPct}%)` : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <h3 class="comparaison-subtitle">Par équipe</h3>
    <div class="table-wrap">
      <table class="table">
        <thead><tr><th>Équipe</th><th>${comp.anneeA}</th><th>${comp.anneeB}</th><th>Écart</th></tr></thead>
        <tbody>
          ${comp.comparaisonEquipes.map(eq => `
            <tr>
              <td>${eq.nom}</td>
              <td>${formatMontant(eq.montantA)}</td>
              <td>${eq.montantB !== null ? formatMontant(eq.montantB) : '—'}</td>
              <td style="color:${tendanceColor(eq.tendance)};font-weight:600;">
                ${tendanceIcon(eq.tendance)} ${eq.ecart !== null ? (eq.ecart >= 0 ? '+' : '') + formatMontant(eq.ecart) : 'Nouveau'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

window.voirDetailSaison = async (annee) => {
  const saison = await lireSaison(annee);
  if (!saison) return;
  const modal = document.getElementById("modal-historique");
  modal.innerHTML = `
    <div class="modal-inner">
      <h2>Saison ${saison.annee}</h2>
      <div class="stats-grid" style="margin-bottom:16px;">
        <div class="stat-card stat-card--primary">
          <div class="stat-value">${formatMontant(saison.totalCollecte)}</div>
          <div class="stat-label">Total collecté</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${saison.nbDons}</div>
          <div class="stat-label">Dons reçus</div>
        </div>
      </div>
      <h3 class="comparaison-subtitle">Secteurs (${saison.secteurs?.length || 0})</h3>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Secteur</th><th>Équipe</th><th>Montant</th></tr></thead>
          <tbody>
            ${(saison.secteurs || []).map(s => `
              <tr><td>${s.nom}</td><td>${s.equipeNom || '—'}</td><td>${formatMontant(s.totalCollecte)}</td></tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="modal-actions">
        <button class="btn btn--ghost" onclick="closeModal()">Fermer</button>
      </div>
    </div>
  `;
  modal.classList.remove("hidden");
};

window.supprimerSaisonConfirm = async (annee) => {
  if (!confirm(`Supprimer définitivement l'archive de la saison ${annee} ?`)) return;
  try {
    await supprimerSaison(annee);
    toast("Saison supprimée", "success");
    await chargerHistorique();
  } catch(e) { toast(e.message, "error"); }
};

function showSaisieManuelleModal() {
  const modal = document.getElementById("modal-historique");
  modal.innerHTML = `
    <div class="modal-inner">
      <h2>Saisir une saison passée</h2>
      <p class="login-hint">Renseigne les totaux récupérés auprès de l'amicale. Le détail des secteurs est optionnel.</p>
      <label class="label">Année *</label>
      <input id="sm-annee" class="input" type="number" placeholder="2025" min="2000" max="2099">
      <label class="label">Total collecté (€) *</label>
      <input id="sm-total" class="input" type="number" step="0.01" placeholder="0.00">
      <label class="label">Dont espèces (€)</label>
      <input id="sm-especes" class="input" type="number" step="0.01" placeholder="0.00">
      <label class="label">Dont chèques (€)</label>
      <input id="sm-cheques" class="input" type="number" step="0.01" placeholder="0.00">
      <label class="label">Nombre de dons</label>
      <input id="sm-nbdons" class="input" type="number" placeholder="0">
      <label class="label">Détail par secteur (optionnel — format : nom,commune,montant — un par ligne)</label>
      <textarea id="sm-secteurs" class="input textarea" rows="6" placeholder="Chambray,Chambray,250.00&#10;Boncourt,Boncourt,180.50"></textarea>
      <label class="label">Note</label>
      <input id="sm-note" class="input" placeholder="Source des données, remarques...">
      <div class="modal-actions">
        <button id="btn-save-sm" class="btn btn--primary">Enregistrer</button>
        <button class="btn btn--ghost" onclick="closeModal()">Annuler</button>
      </div>
    </div>
  `;
  modal.classList.remove("hidden");

  document.getElementById("btn-save-sm")?.addEventListener("click", async () => {
    const annee = document.getElementById("sm-annee").value;
    const totalCollecte = document.getElementById("sm-total").value;
    if (!annee || !totalCollecte) { toast("Année et total obligatoires", "error"); return; }

    const secteursRaw = document.getElementById("sm-secteurs").value.trim();
    const secteurs = secteursRaw ? secteursRaw.split('\n').map(line => {
      const [nom, commune, montant] = line.split(',').map(s => s.trim());
      return { nom, commune, totalCollecte: parseFloat(montant) || 0 };
    }).filter(s => s.nom) : [];

    try {
      await saisirSaisonManuelle({
        annee,
        totalCollecte: parseFloat(totalCollecte),
        totalEspeces: parseFloat(document.getElementById("sm-especes").value) || 0,
        totalCheques: parseFloat(document.getElementById("sm-cheques").value) || 0,
        nbDons: parseInt(document.getElementById("sm-nbdons").value) || 0,
        secteurs,
        note: document.getElementById("sm-note").value.trim()
      });
      toast(`Saison ${annee} enregistrée ✅`, "success");
      closeModal();
      await chargerHistorique();
    } catch(e) { toast(e.message, "error"); }
  });
}

function showArchiverModal() {
  const modal = document.getElementById("modal-historique");
  const anneeActuelle = new Date().getFullYear();
  modal.innerHTML = `
    <div class="modal-inner">
      <h2>Archiver la saison en cours</h2>
      <p class="login-hint" style="color:var(--rouge);font-weight:600;">
        ⚠️ Cette action va sauvegarder un instantané de toutes les données actuelles (secteurs, équipes, totaux),
        puis SUPPRIMER les secteurs, équipes et passages actuels pour repartir sur une saison vierge.
        Cette action est irréversible.
      </p>
      <label class="label">Année à archiver</label>
      <input id="arch-annee" class="input" type="number" value="${anneeActuelle}" min="2000" max="2099">
      <label class="checkbox-label" style="margin-top:16px;">
        <input type="checkbox" id="arch-confirm">
        Je confirme vouloir archiver et réinitialiser la tournée
      </label>
      <div class="modal-actions">
        <button id="btn-confirm-archiver" class="btn btn--danger" disabled>📦 Archiver et réinitialiser</button>
        <button class="btn btn--ghost" onclick="closeModal()">Annuler</button>
      </div>
    </div>
  `;
  modal.classList.remove("hidden");

  const checkbox = document.getElementById("arch-confirm");
  const btnConfirm = document.getElementById("btn-confirm-archiver");
  checkbox?.addEventListener("change", () => { btnConfirm.disabled = !checkbox.checked; });

  btnConfirm?.addEventListener("click", async () => {
    const annee = document.getElementById("arch-annee").value;
    setLoading(btnConfirm, true);
    try {
      await archiverSaison(annee);
      const nbSupprimes = await reinitialiserSaison();
      toast(`Saison ${annee} archivée ✅ — ${nbSupprimes} document(s) réinitialisé(s)`, "success");
      closeModal();
      await chargerHistorique();
    } catch(e) {
      toast("Erreur : " + e.message, "error");
      setLoading(btnConfirm, false);
    }
  });
}



// ════════════════════════════════════════════════════════════
//  CLASSEMENT & RÉCOMPENSES
// ════════════════════════════════════════════════════════════

async function renderClassement() {
  if (APP.role !== "admin") { naviguer("#login"); return; }
  stopUnsubs();

  document.getElementById("main").innerHTML = layoutAdmin("#classement", `
    <div class="page-header"><h1>🏆 Classement & Récompenses</h1></div>
    <div id="classement-content"><div class="loader">Chargement…</div></div>
  `);
  bindLogout();

  async function refresh() {
    const [stats, secteurs, passages] = await Promise.all([
      statsGlobalesTournee(),
      lireSecteurs(),
      fsGetAll(COLLECTIONS.PASSAGES)
    ]);
    const content = document.getElementById("classement-content");
    if (!content) return;

    const podium = getPodium(stats.parEquipe);
    const badgesParEquipe = calculerBadges(stats.parEquipe, secteurs, passages);

    content.innerHTML = `
      ${podium.length > 0 ? `
      <div class="podium-wrap">
        ${podium[1] ? renderPodiumPlace(podium[1], 2, secteurs) : '<div class="podium-place podium-place--empty"></div>'}
        ${podium[0] ? renderPodiumPlace(podium[0], 1, secteurs) : '<div class="podium-place podium-place--empty"></div>'}
        ${podium[2] ? renderPodiumPlace(podium[2], 3, secteurs) : '<div class="podium-place podium-place--empty"></div>'}
      </div>
      ` : '<p class="empty-state">Aucune équipe pour le moment.</p>'}

      <div class="section-block">
        <h2>Toutes les équipes</h2>
        <div class="equipes-ranking-grid">
          ${stats.parEquipe.map((eq, i) => {
            const pct = pourcentCompletionEquipe(eq.id, secteurs);
            const palier = getPalier(pct);
            const badges = badgesParEquipe[eq.id] || [];
            return `
            <div class="ranking-card">
              <div class="ranking-card-top">
                <span class="ranking-pos">#${i+1}</span>
                <span class="ranking-nom">${eq.nom}</span>
                <span class="ranking-palier" title="${palier.label}">${palier.icone}</span>
              </div>
              <div class="ranking-montant">${formatMontant(eq.montant)}</div>
              <div class="ranking-bar-wrap">
                <div class="ranking-bar" style="width:${pct}%"></div>
              </div>
              <div class="ranking-sub">${pct}% des secteurs terminés</div>
              ${badges.length > 0 ? `<div class="ranking-badges">${badges.map(b => `<span title="${b.nom} — ${b.description}">${b.icone}</span>`).join('')}</div>` : `<div class="ranking-badges ranking-badges--empty">Aucun badge pour l'instant</div>`}
            </div>
          `}).join('')}
        </div>
      </div>

      <div class="section-block">
        <h2>Tous les badges disponibles</h2>
        <div class="badges-grid">
          ${BADGES.map(b => `
            <div class="badge-card">
              <div class="badge-card-icon">${b.icone}</div>
              <div class="badge-card-nom">${b.nom}</div>
              <div class="badge-card-desc">${b.description}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  await refresh();
  const unsub = ecouterSecteurs(async () => { await refresh(); });
  APP.unsubs.push(unsub);
}

function renderPodiumPlace(eq, place, secteurs) {
  const hauteurs = { 1: "podium-place--1", 2: "podium-place--2", 3: "podium-place--3" };
  const medailles = { 1: "🥇", 2: "🥈", 3: "🥉" };
  const pct = pourcentCompletionEquipe(eq.id, secteurs);
  return `
    <div class="podium-place ${hauteurs[place]}">
      <div class="podium-medaille">${medailles[place]}</div>
      <div class="podium-nom">${eq.nom}</div>
      <div class="podium-montant">${formatMontant(eq.montant)}</div>
      <div class="podium-pct">${pct}%</div>
      <div class="podium-bloc">${place}</div>
    </div>
  `;
}

// ════════════════════════════════════════════════════════════
//  CONFIG
// ════════════════════════════════════════════════════════════

async function renderConfig() {
  if (APP.role !== "admin") { naviguer("#login"); return; }
  stopUnsubs();

  const config = await lireConfig() || {};
  document.getElementById("main").innerHTML = layoutAdmin("#config", `
    <div class="page-header"><h1>Configuration de la tournée</h1></div>
    <div class="form-card">
      <label class="label">Année</label>
      <input id="cfg-annee" class="input" value="${config.annee || new Date().getFullYear()}" type="number">
      <label class="label">Date de début</label>
      <input id="cfg-debut" class="input" type="date" value="${config.dateDebut || ''}">
      <label class="label">Date de fin</label>
      <input id="cfg-fin" class="input" type="date" value="${config.dateFin || ''}">
      <label class="label">Objectif de collecte (€)</label>
      <input id="cfg-objectif" class="input" type="number" value="${config.objectif || ''}">
      <label class="label">Message affiché aux équipiers</label>
      <textarea id="cfg-message" class="input textarea" rows="3">${config.messageEquipiers || ''}</textarea>
      <label class="label">Admins autorisés (emails, un par ligne)</label>
      <textarea id="cfg-admins" class="input textarea" rows="5">${(config.admins || []).join('\n')}</textarea>
      <button id="btn-save-config" class="btn btn--primary">💾 Enregistrer</button>
    </div>
  `);
  bindLogout();

  document.getElementById("btn-save-config")?.addEventListener("click", async () => {
    const admins = document.getElementById("cfg-admins").value.split('\n').map(e => e.trim()).filter(Boolean);
    try {
      await sauvegarderConfig({
        annee:           Number(document.getElementById("cfg-annee").value),
        dateDebut:       document.getElementById("cfg-debut").value,
        dateFin:         document.getElementById("cfg-fin").value,
        objectif:        Number(document.getElementById("cfg-objectif").value),
        messageEquipiers: document.getElementById("cfg-message").value.trim(),
        admins
      });
      // Mettre à jour la collection admins
      for (const email of admins) {
        await fsSet("admins", email, { email, grantedAt: new Date().toISOString() });
      }
      toast("Configuration sauvegardée ✅", "success");
    } catch(e) { toast(e.message, "error"); }
  });
}

// ════════════════════════════════════════════════════════════
//  TERRAIN (vue équipier)
// ════════════════════════════════════════════════════════════

async function renderTerrain() {
  if (APP.role !== "equipier") { naviguer("#login"); return; }
  stopUnsubs();

  document.getElementById("main").innerHTML = `
    <div class="terrain-layout">
      <header class="terrain-header">
        <div class="terrain-brand">🚒 SP Pacy — Tournée Calendriers</div>
        <div class="terrain-equipe">👥 ${APP.equipeNom}</div>
        ${renderNetworkBadge()}
        <button id="btn-logout-terrain" class="btn btn--ghost btn--sm">Quitter</button>
      </header>
      <div id="terrain-content">
        <div class="loader">Chargement de tes secteurs…</div>
      </div>
    </div>
  `;

  const unsubNet = bindNetworkBadge();
  APP.unsubs.push(unsubNet);

  document.getElementById("btn-logout-terrain")?.addEventListener("click", () => {
    sessionStorage.removeItem("equipe");
    APP.role = null; APP.user = null; APP.equipeId = null; APP.equipeNom = null;
    naviguer("#login");
  });

  const unsub = ecouterSecteursEquipe(APP.equipeId, renderTerrainSecteurs);
  APP.unsubs.push(unsub);
}

function renderTerrainSecteurs(secteurs) {
  const content = document.getElementById("terrain-content");
  if (!content) return;
  if (secteurs.length === 0) {
    content.innerHTML = `<p class="empty-state terrain-empty">Aucun secteur assigné à ton équipe pour le moment.<br>Le chef d'amicale t'en attribuera prochainement.</p>`;
    return;
  }

  // Calcul progression globale de l'équipe
  const nbTotal    = secteurs.length;
  const nbTermines = secteurs.filter(s => s.statut === "termine").length;
  const pct        = Math.round((nbTermines / nbTotal) * 100);
  const palier     = getPalier(pct);
  const couleurBar = pct === 100 ? "#EAB308" : pct >= 75 ? "#F59E0B" : pct >= 50 ? "#9CA3AF" : pct >= 25 ? "#B45309" : "#EF4444";

  content.innerHTML = `
    <div class="terrain-progress-wrap">
      <div class="terrain-progress-label">
        <span>${palier.icone} Ma progression — ${palier.label}</span>
        <span style="color:${couleurBar};font-weight:700;">${pct}%</span>
      </div>
      <div class="terrain-progress-bar">
        <div class="terrain-progress-fill" style="width:${pct}%;background:${couleurBar};"></div>
      </div>
      <div style="font-size:.78rem;color:var(--ardoise-mid);margin-top:6px;">${nbTermines} / ${nbTotal} secteur(s) terminé(s)</div>
    </div>

    <div class="terrain-secteurs">
      ${secteurs.map(s => {
        const sPct = s.statut === "termine" ? 100 : s.statut === "en_cours" ? 50 : 0;
        return `
        <div class="terrain-secteur-card" onclick="naviguerTerrain('${s.id}')">
          <div class="terrain-secteur-header">
            <span class="terrain-secteur-dot" style="background:${s.couleur || '#EF4444'}"></span>
            <div>
              <div class="terrain-secteur-nom">${s.nom}</div>
              <div class="terrain-secteur-commune">${s.commune}</div>
            </div>
            <span class="badge badge--${s.statut}">${STATUT_LABEL[s.statut]}</span>
          </div>
          <div class="terrain-secteur-stats">
            <span>💰 ${formatMontant(s.totalCollecte)}</span>
            <span>✅ ${s.nbFoyersVisites || 0} visités</span>
            <span>🔔 ${s.nbFoyersAbsents || 0} absents</span>
          </div>
          ${s.rues?.length ? `<div class="terrain-secteur-rues">${s.rues.join(' · ')}</div>` : ''}
        </div>
      `}).join('')}
    </div>
  `;
}

window.naviguerTerrain = (secteurId) => {
  sessionStorage.setItem("secteurActif", secteurId);
  naviguer("#terrain-passages");
};

// ════════════════════════════════════════════════════════════
//  TERRAIN — SAISIE PASSAGES
// ════════════════════════════════════════════════════════════

async function renderTerrainPassages() {
  if (APP.role !== "equipier") { naviguer("#login"); return; }
  stopUnsubs();

  const secteurId = sessionStorage.getItem("secteurActif");
  if (!secteurId) { naviguer("#terrain"); return; }

  const secteur = await lireSecteur(secteurId);
  if (!secteur) { naviguer("#terrain"); return; }

  document.getElementById("main").innerHTML = `
    <div class="terrain-layout">
      <header class="terrain-header">
        <button class="btn btn--ghost btn--sm" onclick="naviguer('#terrain')">← Retour</button>
        <div class="terrain-header-title">
          <div class="terrain-secteur-titre">${secteur.nom}</div>
          <div class="terrain-secteur-commune">${secteur.commune}</div>
        </div>
        <span class="badge badge--${secteur.statut}">${STATUT_LABEL[secteur.statut]}</span>
        ${renderNetworkBadge()}
      </header>

      <!-- Mini carte du secteur -->
      <div id="terrain-secteur-map" style="height:200px;margin:0 16px 16px;border-radius:12px;overflow:hidden;border:1.5px solid var(--gris-bord);"></div>

      <!-- Formulaire passage rapide -->
      <div class="passage-form">
        <input id="p-adresse" class="input" placeholder="Adresse / numéro (optionnel)" autocomplete="off">
        <div class="passage-statuts">
          <button class="statut-btn statut-btn--don"   data-statut="don"    onclick="selectStatut('don')">💰 Don</button>
          <button class="statut-btn statut-btn--refuse" data-statut="refuse" onclick="selectStatut('refuse')">🚫 Refus</button>
          <button class="statut-btn statut-btn--absent" data-statut="absent" onclick="selectStatut('absent')">🔔 Absent</button>
        </div>

        <div id="don-details" class="don-details hidden">
          <input id="p-montant" class="input input--montant" type="number" inputmode="decimal"
                 min="0" step="0.50" placeholder="Montant (€)">
          <div class="mode-paiement">
            <button class="mode-btn mode-btn--active" data-mode="especes" onclick="selectMode('especes')">💵 Espèces</button>
            <button class="mode-btn" data-mode="cheque" onclick="selectMode('cheque')">📝 Chèque</button>
            <button class="mode-btn" data-mode="carte" onclick="selectMode('carte')">💳 Carte</button>
          </div>
          <input id="p-donateur" class="input" placeholder="Nom donateur (optionnel)">
        </div>

        <div id="absent-details" class="absent-details hidden">
          <label class="checkbox-label">
            <input type="checkbox" id="p-relance"> À relancer
          </label>
        </div>

        <input id="p-note" class="input" placeholder="Note (optionnel)">
        <button id="btn-saisir" class="btn btn--primary btn--full" disabled>Enregistrer le passage</button>
      </div>

      <!-- Liste des passages du secteur -->
      <div class="passages-terrain">
        <h3>Passages enregistrés</h3>
        <div id="passages-terrain-list"><div class="loader">…</div></div>
      </div>
    </div>
  `;

  // Mini carte du secteur
  initCarte("terrain-secteur-map", { zoom: 13, scrollWheelZoom: false }).then(map => {
    afficherSecteurUnique(map, secteur);
  });

  const unsubNet = bindNetworkBadge();
  APP.unsubs.push(unsubNet);

  let statutSelectionne = null;
  let modeSelectionne   = "especes";

  window.selectStatut = (statut) => {
    statutSelectionne = statut;
    $$(".statut-btn").forEach(b => b.classList.toggle("statut-btn--selected", b.dataset.statut === statut));
    const donDetails    = document.getElementById("don-details");
    const absentDetails = document.getElementById("absent-details");
    donDetails && (statut === "don" ? donDetails.classList.remove("hidden") : donDetails.classList.add("hidden"));
    absentDetails && (statut === "absent" ? absentDetails.classList.remove("hidden") : absentDetails.classList.add("hidden"));
    document.getElementById("btn-saisir").disabled = false;
  };

  window.selectMode = (mode) => {
    modeSelectionne = mode;
    $$(".mode-btn").forEach(b => b.classList.toggle("mode-btn--active", b.dataset.mode === mode));
  };

  document.getElementById("btn-saisir")?.addEventListener("click", async () => {
    if (!statutSelectionne) return;
    const adresse   = document.getElementById("p-adresse")?.value.trim();
    const note      = document.getElementById("p-note")?.value.trim();
    const montant   = parseFloat(document.getElementById("p-montant")?.value || "0");
    const donateur  = document.getElementById("p-donateur")?.value.trim();
    const aRelancer = document.getElementById("p-relance")?.checked;

    if (statutSelectionne === "don" && (!montant || montant <= 0)) {
      toast("Saisis le montant du don", "error"); return;
    }

    const btn = document.getElementById("btn-saisir");
    setLoading(btn, true);
    try {
      await ajouterPassage({
        secteurId,
        equipeId:  APP.equipeId,
        equipeNom: APP.equipeNom,
        adresse,
        statut: aRelancer ? STATUT_PASSAGE.RELANCE : statutSelectionne,
        montant,
        modePaiement: statutSelectionne === "don" ? modeSelectionne : null,
        nomDonateur: donateur,
        note
      });

      // Reset form
      document.getElementById("p-adresse").value  = "";
      document.getElementById("p-montant") && (document.getElementById("p-montant").value = "");
      document.getElementById("p-donateur") && (document.getElementById("p-donateur").value = "");
      document.getElementById("p-note").value = "";
      document.getElementById("p-relance") && (document.getElementById("p-relance").checked = false);
      statutSelectionne = null;
      $$(".statut-btn").forEach(b => b.classList.remove("statut-btn--selected"));
      document.getElementById("don-details")?.classList.add("hidden");
      document.getElementById("absent-details")?.classList.add("hidden");
      btn.disabled = true;
      toast("Passage enregistré ✅", "success");
    } catch(e) { toast(e.message, "error"); }
    setLoading(btn, false);
  });

  // Écoute temps réel
  const unsub = ecouterPassagesSecteur(secteurId, (passages) => {
    const list = document.getElementById("passages-terrain-list");
    if (!list) return;
    if (passages.length === 0) { list.innerHTML = `<p class="empty-state">Aucun passage encore.</p>`; return; }
    list.innerHTML = passages.map(p => `
      <div class="passage-item passage-item--${p.statut}">
        <span class="passage-statut-dot"></span>
        <div class="passage-info">
          <span class="passage-adresse">${p.adresse || '(adresse non précisée)'}</span>
          <span class="passage-badge">${STATUT_PASSAGE_LABEL[p.statut] || p.statut}</span>
          ${p.statut === 'don' ? `<span class="passage-montant">${formatMontant(p.montant)} ${p.modePaiement === 'cheque' ? '📝' : p.modePaiement === 'carte' ? '💳' : '💵'}</span>` : ''}
        </div>
        <span class="passage-heure">${(p.datePassage || '').slice(11,16)}</span>
      </div>
    `).join('');
  });
  APP.unsubs.push(unsub);
}

// Exposer naviguer globalement pour les onclick inline
window.naviguer = naviguer;

// ── Init ──────────────────────────────────────────────────────
// Le hash actuel déclenche l'affichage initial
const initHash = window.location.hash || "#login";
window.dispatchEvent(new HashChangeEvent("hashchange"));

  