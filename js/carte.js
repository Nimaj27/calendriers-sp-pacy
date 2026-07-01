// ============================================================
// carte.js — Carte Leaflet avec contours communes (geo.api.gouv.fr)
// Amicale SP Pacy-sur-Eure — Tournée Calendriers
// ============================================================

// Mapping nom de commune (tel que saisi dans secteurs.commune) → code INSEE
const COMMUNES_INSEE = {
  "Chambray": "27140",
  "Rouvray": "27501",
  "Houlbec-Cocherel": "27343",
  "Ménilles": "27397",
  "Menilles": "27397",
  "Douains": "27203",
  "Saint-Vincent-des-Bois": "27612",
  "La Heunière": "27336",
  "La Heuniere": "27336",
  "Caillouet-Orgeville": "27123",
  "Boncourt": "27081",
  "Vaux-sur-Eure": "27674",
  "Jouy-sur-Eure": "27358",
  "Fontaine-sous-Jouy": "27254",
  "Le Plessis-Hébert": "27465",
  "Le Plessis-Hebert": "27465",
  "Le Cormier": "27171",
  "Boisset-les-Prévanches": "27076",
  "Boisset-les-Prevanches": "27076",
  "Mérey": "27400",
  "Merey": "27400",
  "Fains": "27231",
  "Hécourt": "27326",
  "Hecourt": "27326",
  "Breuilpont": "27114",
  "Neuilly": "27429",
  "Aigleville": "27004",
  "Chaignes": "27136",
  "Croisy-sur-Eure": "27190",
  "Villegats": "27689",
  "Pacy-sur-Eure": "27448",
  "Hardencourt-Cocherel": "27312",
  "Saint-Aquilin-de-Pacy": "27510",
  "Gadencourt": "27273"
};

// Cache des contours GeoJSON déjà récupérés (évite de re-fetch)
const _contourCache = {};

// Couleurs par statut de secteur
const COULEUR_STATUT = {
  libre:    "#9CA3AF",
  affecte:  "#3B82F6",
  en_cours: "#EAB308",
  termine:  "#22C55E"
};

// Palette de couleurs distinctes pour les équipes (cycle si >12 équipes)
const PALETTE_EQUIPES = [
  "#EF4444", "#F97316", "#EAB308", "#84CC16", "#22C55E",
  "#10B981", "#14B8A6", "#06B6D4", "#0EA5E9", "#3B82F6",
  "#6366F1", "#8B5CF6", "#A855F7", "#D946EF", "#EC4899",
  "#F43F5E", "#B91C1C", "#C2410C", "#A16207", "#4D7C0F",
  "#15803D", "#047857", "#0F766E", "#0E7490", "#0369A1",
  "#1D4ED8", "#4338CA", "#6D28D9", "#7E22CE", "#A21CAF",
  "#BE185D", "#9F1239", "#7C2D12", "#854D0E", "#3F6212",
  "#166534", "#065F46", "#155E75", "#1E3A8A", "#312E81"
];

// Attribue une couleur stable à chaque équipe (même équipe = même couleur toujours)
function getCouleurEquipe(equipeId, toutesLesEquipes) {
  if (!equipeId) return COULEUR_STATUT.libre;
  const ids = toutesLesEquipes.map(e => e.id).sort(); // ordre stable
  const idx = ids.indexOf(equipeId);
  if (idx === -1) return COULEUR_STATUT.libre;
  return PALETTE_EQUIPES[idx % PALETTE_EQUIPES.length];
}

// ── Charger dynamiquement Turf.js (calcul géométrique : enveloppe convexe) ──
let _turfLoading = null;
function chargerTurf() {
  if (window.turf) return Promise.resolve();
  if (_turfLoading) return _turfLoading;
  _turfLoading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Impossible de charger Turf.js"));
    document.head.appendChild(script);
  });
  return _turfLoading;
}

// Cache des géocodages de rues (évite de re-fetch la même rue)
const _geocodeCache = {};

// ── Géocoder une rue dans une commune via l'API Adresse BAN ──
async function geocoderRue(rue, commune) {
  const cacheKey = `${rue}|${commune}`;
  if (_geocodeCache[cacheKey] !== undefined) return _geocodeCache[cacheKey];
  try {
    const q = encodeURIComponent(`${rue} ${commune}`);
    const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${q}&limit=1`);
    if (!res.ok) { _geocodeCache[cacheKey] = null; return null; }
    const data = await res.json();
    const feature = data.features?.[0];
    const coords = feature ? feature.geometry.coordinates : null; // [lon, lat]
    _geocodeCache[cacheKey] = coords;
    return coords;
  } catch (e) {
    console.warn("Erreur géocodage", rue, commune, e);
    _geocodeCache[cacheKey] = null;
    return null;
  }
}

// ── Calculer un polygone approximatif (enveloppe convexe) à partir des rues d'un secteur ──
// Retourne un GeoJSON Polygon, ou null si pas assez de points pour former une zone
async function calculerZoneApproximative(rues, commune) {
  if (!rues || rues.length === 0) return null;
  await chargerTurf();

  const points = [];
  for (const rue of rues) {
    const coords = await geocoderRue(rue, commune);
    if (coords) points.push(coords);
  }

  if (points.length < 3) {
    // Pas assez de points pour un polygone : on fait un petit cercle autour du seul point dispo
    if (points.length > 0) {
      try {
        const circle = turf.circle(points[0], 0.3, { units: "kilometers", steps: 24 });
        return circle; // déjà un Feature complet
      } catch (e) { return null; }
    }
    return null;
  }

  try {
    const fc = turf.featureCollection(points.map(p => turf.point(p)));
    const hull = turf.convex(fc);
    if (!hull) return null;
    // Légère expansion (buffer) pour que la zone ne soit pas trop "collée" aux points
    return turf.buffer(hull, 0.15, { units: "kilometers" }) || hull; // Feature complet
  } catch (e) {
    console.warn("Erreur calcul enveloppe convexe", e);
    return null;
  }
}

// ── Récupérer le contour GeoJSON d'une commune via son code INSEE ──
async function fetchContourCommune(codeInsee) {
  if (_contourCache[codeInsee]) return _contourCache[codeInsee];
  try {
    const res = await fetch(`https://geo.api.gouv.fr/communes/${codeInsee}?format=geojson&geometry=contour`);
    if (!res.ok) return null;
    const geojson = await res.json();
    _contourCache[codeInsee] = geojson;
    return geojson;
  } catch (e) {
    console.warn("Erreur fetch contour", codeInsee, e);
    return null;
  }
}

// ── Charger dynamiquement Leaflet (CSS + JS) si pas déjà fait ──
let _leafletLoading = null;
function chargerLeaflet() {
  if (window.L) return Promise.resolve();
  if (_leafletLoading) return _leafletLoading;

  _leafletLoading = new Promise((resolve, reject) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(css);

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Impossible de charger Leaflet"));
    document.head.appendChild(script);
  });
  return _leafletLoading;
}

// ── Initialiser une carte Leaflet dans un conteneur ──
async function initCarte(containerId, options = {}) {
  await chargerLeaflet();
  const map = L.map(containerId, {
    center: options.center || [49.029, 1.398], // Pacy-sur-Eure approx
    zoom: options.zoom || 11,
    scrollWheelZoom: options.scrollWheelZoom !== false
  });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);
  return map;
}

// ── Afficher tous les secteurs sur une carte, colorés par équipe affectée ──
async function afficherSecteursSurCarte(map, secteurs, equipes = []) {
  const layers = [];
  const bounds = [];

  for (const secteur of secteurs) {
    const codeInsee = COMMUNES_INSEE[secteur.commune];
    if (!codeInsee) continue;

    // Si le secteur a des rues précisées, on tente une zone approximative par géocodage
    // Sinon (ou en cas d'échec), on retombe sur le contour complet de la commune
    let geojson = null;
    if (secteur.rues && secteur.rues.length > 0) {
      geojson = await calculerZoneApproximative(secteur.rues, secteur.commune);
    }
    if (!geojson) {
      geojson = await fetchContourCommune(codeInsee);
    }
    if (!geojson) continue;

    // Couleur = couleur de l'équipe affectée (stable et unique par équipe), sinon gris "libre"
    const couleur = getCouleurEquipe(secteur.equipeId, equipes);

    const layer = L.geoJSON(geojson, {
      style: {
        color: "#FFFFFF",
        weight: 2,
        opacity: 0.9,
        fillColor: couleur,
        fillOpacity: secteur.statut === "termine" ? 0.65 : secteur.statut === "en_cours" ? 0.5 : secteur.equipeId ? 0.4 : 0.25
      }
    });

    const popupContent = `
      <div style="font-family:Inter,sans-serif;min-width:160px;">
        <strong style="font-size:13px;">${secteur.nom}</strong><br>
        <span style="font-size:12px;color:#666;">${secteur.commune}</span><br>
        <span style="font-size:12px;">👥 ${secteur.equipNom || 'Non affecté'}</span><br>
        <span style="font-size:12px;font-weight:700;color:#16A34A;">${Number(secteur.totalCollecte || 0).toLocaleString('fr-FR')} €</span>
      </div>
    `;
    layer.bindPopup(popupContent);
    layer.addTo(map);
    layers.push(layer);

    const b = layer.getBounds();
    if (b.isValid()) bounds.push(b);
  }

  if (bounds.length > 0) {
    let allBounds = bounds[0];
    bounds.forEach(b => { allBounds = allBounds.extend(b); });
    map.fitBounds(allBounds, { padding: [20, 20] });
  }

  return layers;
}

// ── Afficher un seul secteur (vue terrain équipier) ──
async function afficherSecteurUnique(map, secteur) {
  const codeInsee = COMMUNES_INSEE[secteur.commune];
  if (!codeInsee) return null;

  const geojson = await fetchContourCommune(codeInsee);
  if (!geojson) return null;

  const couleur = secteur.couleur || "#CC1D1D";
  const layer = L.geoJSON(geojson, {
    style: {
      color: couleur,
      weight: 3,
      fillColor: couleur,
      fillOpacity: 0.3
    }
  });
  layer.addTo(map);

  const bounds = layer.getBounds();
  if (bounds.isValid()) {
    map.fitBounds(bounds, { padding: [30, 30] });
  }

  return layer;
}

// ── Nettoyer une carte (avant de la recréer) ──
function detruireCarte(map) {
  if (map) {
    try { map.remove(); } catch(e) {}
  }
}

