// ============================================================
// tournee.js — Logique métier tournée calendriers
// Amicale SP Pacy-sur-Eure — Tournée Calendriers
// ============================================================

import {
  COLLECTIONS, fsAdd, fsSet, fsUpdate, fsDelete,
  fsGet, fsGetAll, fsQuery, fsListen, fsListenDoc,
  where, orderBy, serverTimestamp
} from "./firebase.js";
import { recalculerTotauxSecteur } from "./secteurs.js";

// ── Statuts de passage foyer ──────────────────────────────────
export const STATUT_PASSAGE = {
  DON:     "don",      // Don remis (espèces ou chèque)
  REFUSE:  "refuse",   // Présent mais refuse
  ABSENT:  "absent",   // Absent, à relancer éventuellement
  RELANCE: "relance"   // Absent, marqué à relancer
};

export const STATUT_PASSAGE_LABEL = {
  don:     "Don collecté",
  refuse:  "A refusé",
  absent:  "Absent",
  relance: "À relancer"
};

export const MODE_PAIEMENT = {
  ESPECES: "especes",
  CHEQUE:  "cheque"
};

// ════════════════════════════════════════════════════════════
//  ÉQUIPES
// ════════════════════════════════════════════════════════════

export async function creerEquipe({ nom, membres = [], pin }) {
  if (!nom)      throw new Error("Nom d'équipe obligatoire");
  if (!pin || !/^\d{4}$/.test(pin)) throw new Error("PIN doit être 4 chiffres");

  // Vérifier unicité du PIN
  const existants = await fsQuery(COLLECTIONS.EQUIPES, where("pin", "==", pin));
  if (existants.length > 0) throw new Error("Ce PIN est déjà utilisé par une autre équipe");

  return fsAdd(COLLECTIONS.EQUIPES, { nom, membres, pin, actif: true });
}

export async function mettreAJourEquipe(equipeId, data) {
  if (data.pin && !/^\d{4}$/.test(data.pin)) throw new Error("PIN doit être 4 chiffres");
  if (data.pin) {
    const existants = await fsQuery(COLLECTIONS.EQUIPES, where("pin", "==", data.pin));
    if (existants.some(e => e.id !== equipeId)) throw new Error("Ce PIN est déjà utilisé");
  }
  return fsUpdate(COLLECTIONS.EQUIPES, equipeId, data);
}

export async function supprimerEquipe(equipeId) {
  return fsDelete(COLLECTIONS.EQUIPES, equipeId);
}

export async function lireEquipes() {
  return fsGetAll(COLLECTIONS.EQUIPES);
}

export async function lireEquipe(equipeId) {
  return fsGet(COLLECTIONS.EQUIPES, equipeId);
}

export function ecouterEquipes(callback) {
  return fsListen(COLLECTIONS.EQUIPES, callback, orderBy("nom"));
}

// ════════════════════════════════════════════════════════════
//  PASSAGES
// ════════════════════════════════════════════════════════════

export async function ajouterPassage({
  secteurId, equipeId, equipeNom,
  adresse, statut, montant = 0,
  modePaiement = null, nomDonateur = "", note = ""
}) {
  if (!secteurId || !equipeId) throw new Error("secteurId et equipeId obligatoires");
  if (!Object.values(STATUT_PASSAGE).includes(statut)) throw new Error("Statut invalide");
  if (statut === STATUT_PASSAGE.DON && montant <= 0) throw new Error("Montant requis pour un don");

  const passage = await fsAdd(COLLECTIONS.PASSAGES, {
    secteurId,
    equipeId,
    equipeNom,
    adresse: adresse || "",
    statut,
    montant: statut === STATUT_PASSAGE.DON ? Number(montant) : 0,
    modePaiement: statut === STATUT_PASSAGE.DON ? modePaiement : null,
    nomDonateur,
    note,
    aRelancer: statut === STATUT_PASSAGE.ABSENT,
    datePassage: new Date().toISOString()
  });

  // Recalcul automatique des totaux du secteur
  await recalculerTotauxSecteur(secteurId);
  return passage;
}

export async function modifierPassage(passageId, data) {
  await fsUpdate(COLLECTIONS.PASSAGES, passageId, data);
  if (data.secteurId) await recalculerTotauxSecteur(data.secteurId);
}

export async function supprimerPassage(passageId, secteurId) {
  await fsDelete(COLLECTIONS.PASSAGES, passageId);
  await recalculerTotauxSecteur(secteurId);
}

// ── Marquer un absent comme "à relancer" ─────────────────────
export async function marquerRelance(passageId, secteurId) {
  await fsUpdate(COLLECTIONS.PASSAGES, passageId, {
    aRelancer: true,
    statut: STATUT_PASSAGE.RELANCE
  });
  await recalculerTotauxSecteur(secteurId);
}

// ── Passages d'un secteur ─────────────────────────────────────
export async function passagesDuSecteur(secteurId) {
  return fsQuery(
    COLLECTIONS.PASSAGES,
    where("secteurId", "==", secteurId),
    orderBy("datePassage", "asc")
  );
}

// ── Passages d'une équipe ─────────────────────────────────────
export async function passagesDeLEquipe(equipeId) {
  return fsQuery(
    COLLECTIONS.PASSAGES,
    where("equipeId", "==", equipeId),
    orderBy("datePassage", "asc")
  );
}

// ── Foyers à relancer ─────────────────────────────────────────
export async function foyersARelancer() {
  return fsQuery(COLLECTIONS.PASSAGES, where("aRelancer", "==", true));
}

// ── Écoute temps réel passages d'un secteur ──────────────────
export function ecouterPassagesSecteur(secteurId, callback) {
  return fsListen(
    COLLECTIONS.PASSAGES,
    callback,
    where("secteurId", "==", secteurId),
    orderBy("datePassage", "desc")
  );
}

// ════════════════════════════════════════════════════════════
//  STATISTIQUES
// ════════════════════════════════════════════════════════════

export async function statsGlobalesTournee() {
  const [passages, equipes, secteurs] = await Promise.all([
    fsGetAll(COLLECTIONS.PASSAGES),
    fsGetAll(COLLECTIONS.EQUIPES),
    fsGetAll(COLLECTIONS.SECTEURS)
  ]);

  let totalEspeces = 0;
  let totalCheques = 0;
  let nbDons       = 0;
  let nbRefus      = 0;
  let nbAbsents    = 0;
  let nbRelances   = 0;

  for (const p of passages) {
    if (p.statut === "don") {
      nbDons++;
      if (p.modePaiement === "especes") totalEspeces += Number(p.montant || 0);
      else if (p.modePaiement === "cheque") totalCheques += Number(p.montant || 0);
    }
    if (p.statut === "refuse")  nbRefus++;
    if (p.statut === "absent")  nbAbsents++;
    if (p.statut === "relance") nbRelances++;
  }

  const totalCollecte = totalEspeces + totalCheques;

  // Par équipe
  const parEquipe = equipes.map(eq => {
    const eqPassages = passages.filter(p => p.equipeId === eq.id);
    const montant = eqPassages
      .filter(p => p.statut === "don")
      .reduce((s, p) => s + Number(p.montant || 0), 0);
    return { ...eq, montant, nbPassages: eqPassages.length };
  }).sort((a, b) => b.montant - a.montant);

  const nbSecteursTermines = secteurs.filter(s => s.statut === "termine").length;
  const nbSecteursTotal    = secteurs.length;
  const avancement         = nbSecteursTotal > 0
    ? Math.round((nbSecteursTermines / nbSecteursTotal) * 100)
    : 0;

  return {
    totalCollecte, totalEspeces, totalCheques,
    nbDons, nbRefus, nbAbsents, nbRelances,
    nbPassages: passages.length,
    nbSecteursTermines, nbSecteursTotal, avancement,
    parEquipe
  };
}

// ════════════════════════════════════════════════════════════
//  CONFIG TOURNÉE
// ════════════════════════════════════════════════════════════

export async function lireConfig() {
  return fsGet(COLLECTIONS.CONFIG, "tournee");
}

export async function sauvegarderConfig(data) {
  return fsSet(COLLECTIONS.CONFIG, "tournee", data);
}

// ════════════════════════════════════════════════════════════
//  EXPORT BILAN CSV
// ════════════════════════════════════════════════════════════

export async function exporterBilanCSV() {
  const [passages, secteurs, equipes] = await Promise.all([
    fsGetAll(COLLECTIONS.PASSAGES),
    fsGetAll(COLLECTIONS.SECTEURS),
    fsGetAll(COLLECTIONS.EQUIPES)
  ]);

  const secteurMap = Object.fromEntries(secteurs.map(s => [s.id, s]));
  const equipeMap  = Object.fromEntries(equipes.map(e => [e.id, e]));

  // Bilan par secteur
  let csv = "BILAN PAR SECTEUR\n";
  csv += "Secteur;Commune;Équipe;Statut;Total collecté (€);Foyers visités;Absents\n";
  for (const s of secteurs) {
    csv += `"${s.nom}";"${s.commune}";"${s.equipNom || '-'}";"${s.statut}";"${(s.totalCollecte || 0).toFixed(2)}";"${s.nbFoyersVisites || 0}";"${s.nbFoyersAbsents || 0}"\n`;
  }

  csv += "\n\nBILAN PAR ÉQUIPE\n";
  csv += "Équipe;Membres;Montant collecté (€);Nb passages\n";
  for (const e of equipes) {
    const eqPassages = passages.filter(p => p.equipeId === e.id);
    const montant    = eqPassages.filter(p => p.statut === "don").reduce((s, p) => s + Number(p.montant || 0), 0);
    csv += `"${e.nom}";"${(e.membres || []).join(', ')}";"${montant.toFixed(2)}";"${eqPassages.length}"\n`;
  }

  csv += "\n\nDÉTAIL DES PASSAGES\n";
  csv += "Date;Équipe;Secteur;Commune;Adresse;Statut;Mode paiement;Montant (€);Nom donateur;Note\n";
  const sorted = [...passages].sort((a, b) => (a.datePassage || "").localeCompare(b.datePassage || ""));
  for (const p of sorted) {
    const s = secteurMap[p.secteurId] || {};
    csv += `"${(p.datePassage || "").slice(0, 10)}";"${p.equipeNom || ''}";"${s.nom || ''}";"${s.commune || ''}";"${p.adresse || ''}";"${p.statut}";"${p.modePaiement || ''}";"${p.montant ? Number(p.montant).toFixed(2) : '0.00'}";"${p.nomDonateur || ''}";"${p.note || ''}"\n`;
  }

  csv += "\n\nFOYERS À RELANCER\n";
  csv += "Équipe;Secteur;Commune;Adresse;Note\n";
  for (const p of passages.filter(p => p.aRelancer)) {
    const s = secteurMap[p.secteurId] || {};
    csv += `"${p.equipeNom || ''}";"${s.nom || ''}";"${s.commune || ''}";"${p.adresse || ''}";"${p.note || ''}"\n`;
  }

  return csv;
}

// ── Télécharger le CSV ────────────────────────────────────────
export function telechargerCSV(csv, filename = "bilan-tournee-calendriers.csv") {
  const bom = "\uFEFF"; // BOM UTF-8 pour Excel
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
