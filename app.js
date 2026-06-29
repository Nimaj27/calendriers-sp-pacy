/* ============================================================
   style.css — Design mobile-first Amicale SP Pacy-sur-Eure
   Palette : rouge pompier #CC1D1D, gris ardoise #2D3142,
             blanc #FFFFFF, orange alerte #F97316, vert succès #16A34A
   ============================================================ */

/* ── Reset & variables ───────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  /* Couleurs SDIS */
  --rouge:       #CC1D1D;
  --rouge-dark:  #A01515;
  --rouge-light: #FDECEA;
  --ardoise:     #2D3142;
  --ardoise-mid: #4A4E6A;
  --ardoise-light: #E8E9EF;
  --blanc:       #FFFFFF;
  --gris-fond:   #F4F5F9;
  --gris-bord:   #D1D5DB;
  --orange:      #F97316;
  --vert:        #16A34A;
  --vert-light:  #DCFCE7;
  --jaune:       #EAB308;
  --jaune-light: #FEF9C3;
  --bleu:        #2563EB;
  --bleu-light:  #DBEAFE;

  /* Spacing */
  --sp-1: 4px; --sp-2: 8px; --sp-3: 12px; --sp-4: 16px;
  --sp-5: 20px; --sp-6: 24px; --sp-8: 32px; --sp-10: 40px;

  /* Border radius */
  --r-sm: 6px; --r-md: 10px; --r-lg: 16px; --r-xl: 24px;

  /* Shadow */
  --shadow-sm: 0 1px 3px rgba(0,0,0,.08);
  --shadow-md: 0 4px 12px rgba(0,0,0,.10);
  --shadow-lg: 0 8px 24px rgba(0,0,0,.14);

  /* Font */
  --font: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'Courier New', monospace;
}

html { font-size: 16px; -webkit-text-size-adjust: 100%; }
body {
  font-family: var(--font);
  background: var(--gris-fond);
  color: var(--ardoise);
  line-height: 1.5;
  min-height: 100vh;
}

/* Google Font */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

/* ── Utilitaires ─────────────────────────────────────────────── */
.hidden { display: none !important; }

/* ── Toasts ──────────────────────────────────────────────────── */
#toasts {
  position: fixed; bottom: var(--sp-5); right: var(--sp-5);
  z-index: 9999; display: flex; flex-direction: column; gap: var(--sp-2);
}
.toast {
  padding: var(--sp-3) var(--sp-5);
  border-radius: var(--r-md);
  font-size: .9rem; font-weight: 500;
  color: var(--blanc); max-width: 320px;
  animation: slideUp .25s ease;
  box-shadow: var(--shadow-md);
}
.toast--info    { background: var(--ardoise); }
.toast--success { background: var(--vert); }
.toast--error   { background: var(--rouge); }
@keyframes slideUp { from { transform: translateY(12px); opacity: 0; } to { transform: none; opacity: 1; } }

/* ── Loader ──────────────────────────────────────────────────── */
.loader {
  padding: var(--sp-8) var(--sp-5);
  text-align: center; color: var(--ardoise-mid);
  font-size: .95rem;
}

/* ── Boutons ─────────────────────────────────────────────────── */
.btn {
  display: inline-flex; align-items: center; gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-5);
  border: none; border-radius: var(--r-md);
  font-family: var(--font); font-size: .9rem; font-weight: 600;
  cursor: pointer; transition: background .15s, transform .1s, opacity .15s;
  text-decoration: none; user-select: none; white-space: nowrap;
}
.btn:active { transform: scale(.97); }
.btn:disabled { opacity: .5; cursor: not-allowed; transform: none; }
.btn--primary { background: var(--rouge); color: var(--blanc); }
.btn--primary:hover:not(:disabled) { background: var(--rouge-dark); }
.btn--ghost { background: transparent; color: var(--ardoise); border: 1.5px solid var(--gris-bord); }
.btn--ghost:hover:not(:disabled) { background: var(--ardoise-light); }
.btn--danger { background: var(--rouge-light); color: var(--rouge-dark); }
.btn--danger:hover:not(:disabled) { background: #f8b4b4; }
.btn--sm { padding: var(--sp-2) var(--sp-3); font-size: .82rem; }
.btn--full { width: 100%; justify-content: center; }

/* ── Inputs ──────────────────────────────────────────────────── */
.input {
  display: block; width: 100%;
  padding: var(--sp-3) var(--sp-4);
  border: 1.5px solid var(--gris-bord);
  border-radius: var(--r-md);
  font-family: var(--font); font-size: .95rem;
  color: var(--ardoise); background: var(--blanc);
  transition: border-color .15s, box-shadow .15s;
  -webkit-appearance: none;
}
.input:focus { outline: none; border-color: var(--rouge); box-shadow: 0 0 0 3px rgba(204,29,29,.12); }
.input.textarea { resize: vertical; min-height: 80px; }
.input--sm { padding: var(--sp-2) var(--sp-3); font-size: .85rem; }
.input--color { padding: var(--sp-2); height: 42px; cursor: pointer; }
.input--montant { font-size: 1.3rem; font-weight: 700; text-align: center; }
.label { display: block; font-size: .85rem; font-weight: 600; color: var(--ardoise-mid); margin: var(--sp-4) 0 var(--sp-1); }

/* ── Badges ──────────────────────────────────────────────────── */
.badge {
  display: inline-block; padding: 2px 8px;
  border-radius: 99px; font-size: .75rem; font-weight: 600;
}
.badge--libre     { background: var(--gris-bord); color: var(--ardoise-mid); }
.badge--affecte   { background: var(--bleu-light); color: var(--bleu); }
.badge--en_cours  { background: var(--jaune-light); color: #92400E; }
.badge--termine   { background: var(--vert-light); color: #14532D; }
.badge--don       { background: var(--vert-light); color: #14532D; }
.badge--refuse    { background: var(--rouge-light); color: var(--rouge-dark); }
.badge--absent    { background: var(--jaune-light); color: #92400E; }
.badge--relance   { background: #FEF3C7; color: #92400E; }

/* ── Page Login ──────────────────────────────────────────────── */
.login-wrap {
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  padding: var(--sp-5);
  background: linear-gradient(135deg, var(--ardoise) 0%, #1a1e30 100%);
}
.login-card {
  background: var(--blanc); border-radius: var(--r-xl);
  padding: var(--sp-8); width: 100%; max-width: 400px;
  box-shadow: var(--shadow-lg);
}
.login-logo {
  display: flex; align-items: center; gap: var(--sp-4);
  margin-bottom: var(--sp-6); padding-bottom: var(--sp-6);
  border-bottom: 1.5px solid var(--ardoise-light);
}
.login-logo img { width: 52px; height: 52px; object-fit: contain; }
.login-logo-icon { font-size: 2.4rem; line-height: 1; flex-shrink: 0; }

.login-logo-title { display: block; font-size: 1.05rem; font-weight: 700; color: var(--ardoise); }
.login-logo-sub   { display: block; font-size: .8rem; color: var(--ardoise-mid); margin-top: 2px; }

/* Tabs login */
.login-tabs {
  display: flex; gap: var(--sp-2); margin-bottom: var(--sp-5);
  background: var(--gris-fond); border-radius: var(--r-md); padding: 4px;
}
.tab-btn {
  flex: 1; padding: var(--sp-2) var(--sp-3);
  background: none; border: none; border-radius: var(--r-sm);
  font-family: var(--font); font-size: .88rem; font-weight: 500;
  color: var(--ardoise-mid); cursor: pointer; transition: all .15s;
}
.tab-btn--active { background: var(--blanc); color: var(--ardoise); box-shadow: var(--shadow-sm); font-weight: 600; }
.login-hint { font-size: .88rem; color: var(--ardoise-mid); margin-bottom: var(--sp-4); }

/* PIN pad */
.pin-display {
  font-family: var(--font-mono); font-size: 2rem; font-weight: 700;
  text-align: center; letter-spacing: 1rem;
  color: var(--ardoise); padding: var(--sp-4);
  background: var(--gris-fond); border-radius: var(--r-md);
  margin-bottom: var(--sp-4);
}
.pin-pad {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-3);
  margin-bottom: var(--sp-3);
}
.pin-key {
  padding: var(--sp-4); border: none; border-radius: var(--r-md);
  background: var(--gris-fond); font-family: var(--font);
  font-size: 1.2rem; font-weight: 600; color: var(--ardoise);
  cursor: pointer; transition: background .1s, transform .1s;
  min-height: 54px;
}
.pin-key:active { background: var(--ardoise-light); transform: scale(.95); }
.pin-key--empty { visibility: hidden; }
.error-msg { color: var(--rouge); font-size: .85rem; text-align: center; margin-top: var(--sp-2); }

/* ── Layout Admin ────────────────────────────────────────────── */
.admin-layout {
  display: flex; min-height: 100vh;
}
.sidebar {
  width: 240px; min-width: 240px;
  background: var(--ardoise); color: var(--blanc);
  display: flex; flex-direction: column;
  position: fixed; top: 0; left: 0; height: 100vh;
  z-index: 100;
}
.sidebar-brand {
  display: flex; align-items: center; gap: var(--sp-3);
  padding: var(--sp-5) var(--sp-5) var(--sp-4);
  border-bottom: 1px solid rgba(255,255,255,.1);
}
.sidebar-icon { font-size: 1.5rem; }
.sidebar-title { font-size: .9rem; font-weight: 700; line-height: 1.3; }
.sidebar-title small { font-weight: 400; opacity: .7; }
.sidebar-nav { flex: 1; padding: var(--sp-4) 0; overflow-y: auto; list-style: none; }
.sidebar-link {
  display: flex; align-items: center; gap: var(--sp-3);
  padding: var(--sp-3) var(--sp-5); color: rgba(255,255,255,.75);
  text-decoration: none; font-size: .9rem; font-weight: 500;
  transition: background .15s, color .15s;
}
.sidebar-link:hover { background: rgba(255,255,255,.08); color: var(--blanc); }
.sidebar-link--active { background: var(--rouge); color: var(--blanc); }
.sidebar-link-icon { font-size: 1.1rem; width: 20px; text-align: center; }
.sidebar-footer { padding: var(--sp-4) var(--sp-5); border-top: 1px solid rgba(255,255,255,.1); }
.sidebar-user { display: block; font-size: .78rem; color: rgba(255,255,255,.5); margin-bottom: var(--sp-2); word-break: break-all; }

.admin-content {
  margin-left: 240px; flex: 1;
  padding: var(--sp-6); min-height: 100vh;
}

/* ── Page header ─────────────────────────────────────────────── */
.page-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: var(--sp-6); flex-wrap: wrap; gap: var(--sp-3);
}
.page-header h1 { font-size: 1.5rem; font-weight: 700; color: var(--ardoise); }

/* ── Stat cards ──────────────────────────────────────────────── */
.stats-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--sp-4); margin-bottom: var(--sp-6);
}
.stat-card {
  background: var(--blanc); border-radius: var(--r-lg);
  padding: var(--sp-5); box-shadow: var(--shadow-sm);
  border: 1.5px solid var(--gris-bord);
}
.stat-card--primary { background: var(--rouge); color: var(--blanc); border-color: var(--rouge-dark); }
.stat-card--primary .stat-label, .stat-card--primary .stat-sub { color: rgba(255,255,255,.8); }
.stat-value { font-size: 1.6rem; font-weight: 700; line-height: 1; margin-bottom: var(--sp-1); }
.stat-label { font-size: .85rem; font-weight: 600; color: var(--ardoise-mid); margin-bottom: var(--sp-2); }
.stat-sub   { font-size: .78rem; color: var(--ardoise-mid); }

/* Progress bar */
.progress-bar { height: 6px; background: var(--ardoise-light); border-radius: 99px; margin: var(--sp-2) 0; overflow: hidden; }
.progress-fill { height: 100%; background: var(--vert); border-radius: 99px; transition: width .4s ease; }

/* ── Section block ───────────────────────────────────────────── */
.section-block {
  background: var(--blanc); border-radius: var(--r-lg);
  padding: var(--sp-5); box-shadow: var(--shadow-sm);
  border: 1.5px solid var(--gris-bord); margin-bottom: var(--sp-5);
}
.section-block h2 { font-size: 1.05rem; font-weight: 700; margin-bottom: var(--sp-4); }

/* Ranking équipes */
.ranking-row {
  display: flex; align-items: center; gap: var(--sp-3);
  padding: var(--sp-3) 0; border-bottom: 1px solid var(--ardoise-light);
}
.ranking-row:last-child { border: none; }
.ranking-pos { width: 24px; font-weight: 700; color: var(--rouge); }
.ranking-nom { flex: 1; font-weight: 500; }
.ranking-montant { font-weight: 700; color: var(--vert); min-width: 90px; text-align: right; }
.ranking-bar-wrap { width: 80px; height: 6px; background: var(--ardoise-light); border-radius: 99px; overflow: hidden; }
.ranking-bar { height: 100%; background: var(--rouge); border-radius: 99px; transition: width .4s; }

/* ── Table ───────────────────────────────────────────────────── */
.table-wrap { overflow-x: auto; }
.table {
  width: 100%; border-collapse: collapse; font-size: .9rem;
}
.table th {
  text-align: left; padding: var(--sp-3) var(--sp-4);
  background: var(--gris-fond); font-weight: 600; font-size: .82rem;
  color: var(--ardoise-mid); border-bottom: 1.5px solid var(--gris-bord);
  white-space: nowrap;
}
.table td { padding: var(--sp-3) var(--sp-4); border-bottom: 1px solid var(--ardoise-light); vertical-align: middle; }
.table tr:last-child td { border: none; }
.table tr:hover td { background: var(--gris-fond); }
.tr--don td { border-left: 3px solid var(--vert); }
.tr--refuse td { border-left: 3px solid var(--rouge); }
.tr--absent td { border-left: 3px solid var(--jaune); }
.td-actions { display: flex; gap: var(--sp-2); white-space: nowrap; }
.pin-code { background: var(--gris-fond); padding: 2px 6px; border-radius: var(--r-sm); font-family: var(--font-mono); font-size: .9rem; }

/* ── Secteurs ────────────────────────────────────────────────── */
.commune-group { margin-bottom: var(--sp-6); }
.commune-title { font-size: .85rem; font-weight: 700; color: var(--ardoise-mid); text-transform: uppercase; letter-spacing: .06em; margin-bottom: var(--sp-3); }
.secteurs-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--sp-4); }
.secteur-card {
  background: var(--blanc); border-radius: var(--r-lg);
  border: 1.5px solid var(--gris-bord); box-shadow: var(--shadow-sm);
  overflow: hidden;
}
.secteur-card--termine { border-color: var(--vert); }
.secteur-card--en_cours { border-color: var(--jaune); }
.secteur-card-header {
  display: flex; align-items: center; gap: var(--sp-3);
  padding: var(--sp-4) var(--sp-4) var(--sp-3);
  border-bottom: 1px solid var(--ardoise-light);
}
.secteur-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
.secteur-card-header strong { flex: 1; font-size: .95rem; }
.secteur-card-body { padding: var(--sp-3) var(--sp-4); }
.secteur-equipe { font-size: .88rem; color: var(--ardoise-mid); margin-bottom: var(--sp-2); }
.secteur-montant { font-size: 1.1rem; font-weight: 700; color: var(--vert); }
.secteur-rues { font-size: .78rem; color: var(--ardoise-mid); margin-top: var(--sp-2); line-height: 1.4; }
.secteur-card-actions { display: flex; gap: var(--sp-2); padding: var(--sp-3) var(--sp-4); flex-wrap: wrap; background: var(--gris-fond); }

/* ── Modal ───────────────────────────────────────────────────── */
.modal {
  position: fixed; inset: 0; background: rgba(0,0,0,.5);
  z-index: 500; display: flex; align-items: flex-end; justify-content: center;
  padding: var(--sp-4);
}
.modal:not(.hidden) { display: flex; }
.modal-inner {
  background: var(--blanc); border-radius: var(--r-xl) var(--r-xl) 0 0;
  width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto;
  padding: var(--sp-6);
}
@media (min-width: 600px) {
  .modal { align-items: center; }
  .modal-inner { border-radius: var(--r-xl); }
}
.modal-inner h2 { font-size: 1.15rem; font-weight: 700; margin-bottom: var(--sp-4); }
.modal-actions { display: flex; gap: var(--sp-3); margin-top: var(--sp-5); flex-wrap: wrap; }

/* ── Form card ───────────────────────────────────────────────── */
.form-card {
  background: var(--blanc); border-radius: var(--r-lg);
  border: 1.5px solid var(--gris-bord); padding: var(--sp-6);
  max-width: 560px; box-shadow: var(--shadow-sm);
}

/* ── Filter bar ──────────────────────────────────────────────── */
.filter-bar { margin-bottom: var(--sp-4); display: flex; gap: var(--sp-3); flex-wrap: wrap; }

/* ── Empty state ─────────────────────────────────────────────── */
.empty-state {
  padding: var(--sp-10) var(--sp-5); text-align: center;
  color: var(--ardoise-mid); font-size: .95rem; line-height: 1.6;
}

/* ── Relances ────────────────────────────────────────────────── */
.relances-count { font-weight: 600; margin-bottom: var(--sp-4); color: var(--rouge); }

/* ══════════════════════════════════════════════════════════════
   TERRAIN (interface équipier mobile)
   ══════════════════════════════════════════════════════════════ */
.terrain-layout {
  min-height: 100vh; display: flex; flex-direction: column;
  background: var(--gris-fond);
}
.terrain-header {
  background: var(--ardoise); color: var(--blanc);
  padding: var(--sp-3) var(--sp-4);
  display: flex; align-items: center; gap: var(--sp-3);
  position: sticky; top: 0; z-index: 50;
}
.terrain-brand { font-size: .9rem; font-weight: 700; flex: 1; }
.terrain-equipe { font-size: .82rem; color: rgba(255,255,255,.7); }
.terrain-header-title { flex: 1; }
.terrain-secteur-titre { font-size: .9rem; font-weight: 700; color: var(--blanc); }
.terrain-secteur-commune { font-size: .78rem; color: rgba(255,255,255,.6); }

/* Liste secteurs terrain */
.terrain-secteurs { padding: var(--sp-4); display: flex; flex-direction: column; gap: var(--sp-3); }
.terrain-empty { padding: var(--sp-8) var(--sp-5); text-align: center; color: var(--ardoise-mid); line-height: 1.7; }
.terrain-secteur-card {
  background: var(--blanc); border-radius: var(--r-lg);
  border: 1.5px solid var(--gris-bord); padding: var(--sp-4);
  cursor: pointer; transition: box-shadow .15s, transform .1s;
  box-shadow: var(--shadow-sm);
}
.terrain-secteur-card:active { transform: scale(.98); box-shadow: var(--shadow-md); }
.terrain-secteur-header { display: flex; align-items: center; gap: var(--sp-3); margin-bottom: var(--sp-3); }
.terrain-secteur-dot { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; }
.terrain-secteur-nom { font-weight: 700; font-size: 1rem; color: var(--ardoise); }
.terrain-secteur-commune { font-size: .8rem; color: var(--ardoise-mid); }
.terrain-secteur-stats { display: flex; gap: var(--sp-4); font-size: .85rem; color: var(--ardoise-mid); margin-bottom: var(--sp-2); }
.terrain-secteur-rues { font-size: .78rem; color: var(--ardoise-mid); }

/* Formulaire passage terrain */
.passage-form {
  background: var(--blanc); border-radius: var(--r-lg);
  margin: var(--sp-4); padding: var(--sp-5);
  box-shadow: var(--shadow-md); border: 1.5px solid var(--gris-bord);
  display: flex; flex-direction: column; gap: var(--sp-3);
}
.passage-statuts { display: flex; gap: var(--sp-2); }
.statut-btn {
  flex: 1; padding: var(--sp-3) var(--sp-2);
  border: 2px solid var(--gris-bord); border-radius: var(--r-md);
  background: none; font-family: var(--font);
  font-size: .85rem; font-weight: 600; cursor: pointer;
  transition: all .15s; text-align: center;
}
.statut-btn--don:hover, .statut-btn--don.statut-btn--selected { background: var(--vert-light); border-color: var(--vert); color: #14532D; }
.statut-btn--refuse:hover, .statut-btn--refuse.statut-btn--selected { background: var(--rouge-light); border-color: var(--rouge); color: var(--rouge-dark); }
.statut-btn--absent:hover, .statut-btn--absent.statut-btn--selected { background: var(--jaune-light); border-color: var(--jaune); color: #78350F; }

.don-details, .absent-details { display: flex; flex-direction: column; gap: var(--sp-3); }
.mode-paiement { display: flex; gap: var(--sp-2); }
.mode-btn {
  flex: 1; padding: var(--sp-3);
  border: 2px solid var(--gris-bord); border-radius: var(--r-md);
  background: none; font-family: var(--font); font-size: .88rem; font-weight: 500;
  cursor: pointer; transition: all .15s;
}
.mode-btn--active { background: var(--bleu-light); border-color: var(--bleu); color: var(--bleu); font-weight: 700; }
.checkbox-label { display: flex; align-items: center; gap: var(--sp-2); font-size: .9rem; cursor: pointer; }
.checkbox-label input { width: 18px; height: 18px; cursor: pointer; }

/* Liste passages terrain */
.passages-terrain { padding: var(--sp-4); }
.passages-terrain h3 { font-size: .95rem; font-weight: 700; margin-bottom: var(--sp-3); color: var(--ardoise-mid); }
.passage-item {
  display: flex; align-items: center; gap: var(--sp-3);
  background: var(--blanc); border-radius: var(--r-md);
  padding: var(--sp-3) var(--sp-4);
  border: 1.5px solid var(--gris-bord);
  margin-bottom: var(--sp-2); box-shadow: var(--shadow-sm);
}
.passage-item--don    .passage-statut-dot { background: var(--vert); }
.passage-item--refuse .passage-statut-dot { background: var(--rouge); }
.passage-item--absent .passage-statut-dot { background: var(--jaune); }
.passage-item--relance .passage-statut-dot { background: var(--orange); }
.passage-statut-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.passage-info { flex: 1; min-width: 0; }
.passage-adresse { display: block; font-size: .88rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.passage-badge { font-size: .75rem; color: var(--ardoise-mid); }
.passage-montant { font-size: .88rem; font-weight: 700; color: var(--vert); margin-left: var(--sp-2); }
.passage-heure { font-size: .78rem; color: var(--ardoise-mid); white-space: nowrap; }

/* ── Responsive ──────────────────────────────────────────────── */
@media (max-width: 767px) {
  .sidebar { display: none; }
  .admin-content { margin-left: 0; padding: var(--sp-4); }
  .stats-grid { grid-template-columns: 1fr 1fr; }
  .secteurs-grid { grid-template-columns: 1fr; }
  .page-header { flex-direction: column; align-items: flex-start; }
}

@media (min-width: 768px) {
  .terrain-layout { max-width: 600px; margin: 0 auto; }
}
