// ============================================================
// secteurs.js — Gestion des secteurs géographiques
// Amicale SP Pacy-sur-Eure — Tournée Calendriers
// ============================================================


// ── Statuts possibles d'un secteur ───────────────────────────
const STATUT_SECTEUR = {
  LIBRE:      "libre",       // Non affecté
  AFFECTE:    "affecte",     // Équipe assignée, pas encore commencé
  EN_COURS:   "en_cours",    // Tournée démarrée
  TERMINE:    "termine"      // Tous les foyers visités
};

const STATUT_LABEL = {
  libre:    "Non affecté",
  affecte:  "Affecté",
  en_cours: "En cours",
  termine:  "Terminé"
};

// ── Création d'un secteur ─────────────────────────────────────
async function creerSecteur({ nom, commune, description = "", rues = [], couleur = "#EF4444" }) {
  if (!nom || !commune) throw new Error("Nom et commune obligatoires");
  return fsAdd(COLLECTIONS.SECTEURS, {
    nom,
    commune,
    description,
    rues,          // tableau de strings : noms de rues / zones
    couleur,       // couleur d'affichage sur le tableau de bord
    statut: STATUT_SECTEUR.LIBRE,
    equipeId: null,
    equipNom: null,
    totalCollecte: 0,
    nbFoyersVisites: 0,
    nbFoyersAbsents: 0,
    nbFoyersTotal: 0,
    dateDebut: null,
    dateFin: null
  });
}

// ── Mise à jour d'un secteur ──────────────────────────────────
async function mettreAJourSecteur(secteurId, data) {
  return fsUpdate(COLLECTIONS.SECTEURS, secteurId, data);
}

// ── Suppression d'un secteur ──────────────────────────────────
async function supprimerSecteur(secteurId) {
  return fsDelete(COLLECTIONS.SECTEURS, secteurId);
}

// ── Affecter une équipe à un secteur ─────────────────────────
async function affecterEquipe(secteurId, equipeId, equipeNom) {
  return fsUpdate(COLLECTIONS.SECTEURS, secteurId, {
    equipeId,
    equipNom: equipeNom,
    statut: STATUT_SECTEUR.AFFECTE
  });
}

// ── Désaffecter l'équipe d'un secteur ────────────────────────
async function desaffecterEquipe(secteurId) {
  return fsUpdate(COLLECTIONS.SECTEURS, secteurId, {
    equipeId: null,
    equipNom: null,
    statut: STATUT_SECTEUR.LIBRE
  });
}

// ── Démarrer la tournée d'un secteur ─────────────────────────
async function demarrerSecteur(secteurId) {
  return fsUpdate(COLLECTIONS.SECTEURS, secteurId, {
    statut: STATUT_SECTEUR.EN_COURS,
    dateDebut: new Date().toISOString()
  });
}

// ── Clôturer un secteur ───────────────────────────────────────
async function cloturerSecteur(secteurId) {
  return fsUpdate(COLLECTIONS.SECTEURS, secteurId, {
    statut: STATUT_SECTEUR.TERMINE,
    dateFin: new Date().toISOString()
  });
}

// ── Lecture des secteurs ──────────────────────────────────────
async function lireSecteurs() {
  return fsGetAll(COLLECTIONS.SECTEURS);
}

async function lireSecteur(secteurId) {
  return fsGet(COLLECTIONS.SECTEURS, secteurId);
}

async function secteursParEquipe(equipeId) {
  return fsQuery(COLLECTIONS.SECTEURS, where("equipeId", "==", equipeId));
}

// ── Écoute temps réel ─────────────────────────────────────────
function ecouterSecteurs(callback) {
  return fsListen(COLLECTIONS.SECTEURS, (secteurs) => {
    secteurs.sort((a, b) => (a.commune + a.nom).localeCompare(b.commune + b.nom));
    callback(secteurs);
  });
}

function ecouterSecteursEquipe(equipeId, callback) {
  return fsListen(COLLECTIONS.SECTEURS, callback, where("equipeId", "==", equipeId));
}

// ── Recalcul des totaux d'un secteur depuis ses passages ──────
async function recalculerTotauxSecteur(secteurId) {
  const passages = await fsQuery(
    COLLECTIONS.PASSAGES,
    where("secteurId", "==", secteurId)
  );
  let totalCollecte   = 0;
  let nbFoyersVisites = 0;
  let nbFoyersAbsents = 0;
  let nbFoyersTotal   = passages.length;

  for (const p of passages) {
    if (p.statut === "don")    { totalCollecte += Number(p.montant || 0); nbFoyersVisites++; }
    if (p.statut === "refuse") { nbFoyersVisites++; }
    if (p.statut === "absent") { nbFoyersAbsents++; }
  }

  await fsUpdate(COLLECTIONS.SECTEURS, secteurId, {
    totalCollecte,
    nbFoyersVisites,
    nbFoyersAbsents,
    nbFoyersTotal
  });
  return { totalCollecte, nbFoyersVisites, nbFoyersAbsents, nbFoyersTotal };
}

// ── Stats globales ────────────────────────────────────────────
async function statsGlobales() {
  const secteurs = await lireSecteurs();
  return {
    total:    secteurs.length,
    libre:    secteurs.filter(s => s.statut === STATUT_SECTEUR.LIBRE).length,
    affecte:  secteurs.filter(s => s.statut === STATUT_SECTEUR.AFFECTE).length,
    en_cours: secteurs.filter(s => s.statut === STATUT_SECTEUR.EN_COURS).length,
    termine:  secteurs.filter(s => s.statut === STATUT_SECTEUR.TERMINE).length,
    totalCollecte: secteurs.reduce((sum, s) => sum + (s.totalCollecte || 0), 0)
  };
}

