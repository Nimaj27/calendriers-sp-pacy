// ============================================================
// app.js — Routing, authentification, navigation principale
// Amicale SP Pacy-sur-Eure — Tournée Calendriers
// ============================================================

import {
  onAuth, loginGoogle, getLoginRedirect, logoutGoogle, loginPin, isAdmin,
  COLLECTIONS, fsGet, fsSet
} from "./firebase.js";
import {
  creerEquipe, mettreAJourEquipe, supprimerEquipe,
  lireEquipes, ecouterEquipes, statsGlobalesTournee,
  ajouterPassage, passagesDuSecteur, passagesDeLEquipe,
  foyersARelancer, marquerRelance, supprimerPassage,
  lireConfig, sauvegarderConfig,
  exporterBilanCSV, telechargerCSV,
  STATUT_PASSAGE, STATUT_PASSAGE_LABEL, MODE_PAIEMENT
} from "./tournee.js";
import {
  creerSecteur, mettreAJourSecteur, supprimerSecteur,
  affecterEquipe, desaffecterEquipe, cloturerSecteur, demarrerSecteur,
  ecouterSecteurs, ecouterSecteursEquipe,
  lireSecteur, statsGlobales,
  STATUT_SECTEUR, STATUT_LABEL
} from "./secteurs.js";

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
  if (user) {
    const admin = await isAdmin(user.email);
    if (admin) {
      APP.role = "admin";
      APP.user = user;
      const hash = window.location.hash;
      naviguer(ROUTES[hash] ? hash : "#dashboard");
      return;
    }
    // Email connecté mais pas admin → déconnexion silencieuse
    await logoutGoogle();
  }
  // Pas d'équipier Firebase Auth — vérifier session PIN
  const sessionEquipe = sessionStorage.getItem("equipe");
  if (sessionEquipe) {
    const eq = JSON.parse(sessionEquipe);
    APP.role = "equipier";
    APP.user = eq;
    APP.equipeId  = eq.id;
    APP.equipeNom = eq.nom;
    naviguer("#terrain");
    return;
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
          <img src="assets/logo.png" alt="SP Pacy" onerror="this.style.display='none'">
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

  // Google — signInWithRedirect (pas de popup, évite les blocages COOP)
  const btnGoogle = document.getElementById("btn-google");
  if (btnGoogle) {
    btnGoogle.addEventListener("click", async () => {
      setLoading(btnGoogle, true);
      try {
        await loginGoogle(); // déclenche la redirection vers Google
        // La page va se recharger — onAuth + getLoginRedirect gèrent le retour
      } catch (e) {
        toast("Erreur de connexion : " + e.message, "error");
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
    { hash: "#config",    icon: "⚙️",  label: "Config" }
  ];
  return `
    <div class="admin-layout">
      <nav class="sidebar">
        <div class="sidebar-brand">
          <span class="sidebar-icon">🚒</span>
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
  `);
  bindLogout();

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
    const content = document.getElementById("dashboard-content");
    if (!content) return;
    content.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card stat-card--primary">
          <div class="stat-value">${formatMontant(stats.totalCollecte)}</div>
          <div class="stat-label">Total collecté</div>
          <div class="stat-sub">💵 Espèces : ${formatMontant(stats.totalEspeces)} | 📝 Chèques : ${formatMontant(stats.totalCheques)}</div>
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
        <h2>Classement des équipes</h2>
        <div class="equipes-ranking">
          ${stats.parEquipe.map((eq, i) => `
            <div class="ranking-row">
              <span class="ranking-pos">${i+1}</span>
              <span class="ranking-nom">${eq.nom}</span>
              <span class="ranking-montant">${formatMontant(eq.montant)}</span>
              <div class="ranking-bar-wrap">
                <div class="ranking-bar" style="width:${stats.totalCollecte > 0 ? Math.round(eq.montant/stats.totalCollecte*100) : 0}%"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  await refreshDashboard();

  // Écoute temps réel sur secteurs → rafraîchit les stats
  const unsub = ecouterSecteurs(async () => { await refreshDashboard(); });
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
      <button id="btn-add-secteur" class="btn btn--primary">+ Nouveau secteur</button>
    </div>
    <div id="secteurs-list"><div class="loader">Chargement…</div></div>
    <div id="modal-secteur" class="modal hidden"></div>
  `);
  bindLogout();

  document.getElementById("btn-add-secteur")?.addEventListener("click", () => showSecteurModal());

  const unsub = ecouterSecteurs(renderSecteursList);
  APP.unsubs.push(unsub);
}

function renderSecteursList(secteurs) {
  const list = document.getElementById("secteurs-list");
  if (!list) return;
  if (secteurs.length === 0) {
    list.innerHTML = `<p class="empty-state">Aucun secteur. Commence par en créer un.</p>`;
    return;
  }
  const communes = [...new Set(secteurs.map(s => s.commune))].sort();
  list.innerHTML = communes.map(commune => `
    <div class="commune-group">
      <h3 class="commune-title">${commune}</h3>
      <div class="secteurs-grid">
        ${secteurs.filter(s => s.commune === commune).map(s => `
          <div class="secteur-card secteur-card--${s.statut}" data-id="${s.id}">
            <div class="secteur-card-header">
              <span class="secteur-dot" style="background:${s.couleur || '#EF4444'}"></span>
              <strong>${s.nom}</strong>
              <span class="badge badge--${s.statut}">${STATUT_LABEL[s.statut]}</span>
            </div>
            <div class="secteur-card-body">
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
    </div>
  `).join('');
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
      <button id="btn-add-equipe" class="btn btn--primary">+ Nouvelle équipe</button>
    </div>
    <div id="equipes-list"><div class="loader">Chargement…</div></div>
    <div id="modal-equipe" class="modal hidden"></div>
  `);
  bindLogout();

  document.getElementById("btn-add-equipe")?.addEventListener("click", () => showEquipeModal());

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

  const secteurs = await (await import("./secteurs.js")).lireSecteurs();

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
      const { fsGetAll, COLLECTIONS } = await import("./firebase.js");
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
  const secteurs  = await (await import("./secteurs.js")).lireSecteurs();
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
      const { fsSet, COLLECTIONS } = await import("./firebase.js");
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
        <button id="btn-logout-terrain" class="btn btn--ghost btn--sm">Quitter</button>
      </header>
      <div id="terrain-content">
        <div class="loader">Chargement de tes secteurs…</div>
      </div>
    </div>
  `;

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
  content.innerHTML = `
    <div class="terrain-secteurs">
      ${secteurs.map(s => `
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
      `).join('')}
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
      </header>

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
          ${p.statut === 'don' ? `<span class="passage-montant">${formatMontant(p.montant)} ${p.modePaiement === 'cheque' ? '📝' : '💵'}</span>` : ''}
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
