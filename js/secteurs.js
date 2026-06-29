// ============================================================
// secteurs.js — Gestion des secteurs géographiques
// Amicale SP Pacy-sur-Eure — Tournée Calendriers
// ============================================================

import {
  COLLECTIONS, fsAdd, fsSet, fsUpdate, fsDelete,
  fsGet, fsGetAll, fsQuery, fsListen,
  where, orderBy
} from "./firebase.js";

// ── Statuts possibles d'un secteur ───────────────────────────
export const STATUT_SECTEUR = {
  LIBRE:      "libre",       // Non affecté
  AFFECTE:    "affecte",     // Équipe assignée, pas encore commencé
  EN_COURS:   "en_cours",    // Tournée démarrée
  TERMINE:    "termine"      // Tous les foyers visités
};

export const STATUT_LABEL = {
  libre:    "Non affecté",
  affecte:  "Affecté",
  en_cours: "En cours",
  termine:  "Terminé"
};

// ── Création d'un secteur ─────────────────────────────────────
export async function creerSecteur({ nom, commune, description = "", rues = [], couleur = "#EF4444" }) {
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
export async function mettreAJourSecteur(secteurId, data) {
  return fsUpdate(COLLECTIONS.SECTEURS, secteurId, data);
}

// ── Suppression d'un secteur ──────────────────────────────────
export async function supprimerSecteur(secteurId) {
  return fsDelete(COLLECTIONS.SECTEURS, secteurId);
}

// ── Affecter une équipe à un secteur ─────────────────────────
export async function affecterEquipe(secteurId, equipeId, equipeNom) {
  return fsUpdate(COLLECTIONS.SECTEURS, secteurId, {
    equipeId,
    equipNom: equipeNom,
    statut: STATUT_SECTEUR.AFFECTE
  });
}

// ── Désaffecter l'équipe d'un secteur ────────────────────────
export async function desaffecterEquipe(secteurId) {
  return fsUpdate(COLLECTIONS.SECTEURS, secteurId, {
    equipeId: null,
    equipNom: null,
    statut: STATUT_SECTEUR.LIBRE
  });
}

// ── Démarrer la tournée d'un secteur ─────────────────────────
export async function demarrerSecteur(secteurId) {
  return fsUpdate(COLLECTIONS.SECTEURS, secteurId, {
    statut: STATUT_SECTEUR.EN_COURS,
    dateDebut: new Date().toISOString()
  });
}

// ── Clôturer un secteur ───────────────────────────────────────
export async function cloturerSecteur(secteurId) {
  return fsUpdate(COLLECTIONS.SECTEURS, secteurId, {
    statut: STATUT_SECTEUR.TERMINE,
    dateFin: new Date().toISOString()
  });
}

// ── Lecture des secteurs ──────────────────────────────────────
export async function lireSecteurs() {
  return fsGetAll(COLLECTIONS.SECTEURS);
}

export async function lireSecteur(secteurId) {
  return fsGet(COLLECTIONS.SECTEURS, secteurId);
}

export async function secteursParEquipe(equipeId) {
  return fsQuery(COLLECTIONS.SECTEURS, where("equipeId", "==", equipeId));
}

// ── Écoute temps réel ─────────────────────────────────────────
export function ecouterSecteurs(callback) {
  return fsListen(COLLECTIONS.SECTEURS, callback, orderBy("commune"), orderBy("nom"));
}

export function ecouterSecteursEquipe(equipeId, callback) {
  return fsListen(COLLECTIONS.SECTEURS, callback, where("equipeId", "==", equipeId));
}

// ── Recalcul des totaux d'un secteur depuis ses passages ──────
export async function recalculerTotauxSecteur(secteurId) {
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
export async function statsGlobales() {
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
