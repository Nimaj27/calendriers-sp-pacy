// ============================================================
// historique.js — Historique multi-années des tournées
// Amicale SP Pacy-sur-Eure — Tournée Calendriers
// ============================================================


const COLLECTION_HISTORIQUE = "historique_saisons";

// ── Archiver la saison en cours sous une année donnée ──────────
// Capture un snapshot complet : secteurs, équipes, stats globales
// Puis vide les collections actives pour repartir sur une saison neuve
async function archiverSaison(annee) {
  if (!annee || !/^\d{4}$/.test(String(annee))) {
    throw new Error("Année invalide");
  }

  const [secteurs, equipes, stats] = await Promise.all([
    lireSecteurs(),
    lireEquipes(),
    statsGlobalesTournee()
  ]);

  const snapshot = {
    annee: Number(annee),
    dateArchivage: new Date().toISOString(),
    totalCollecte: stats.totalCollecte,
    totalEspeces: stats.totalEspeces,
    totalCheques: stats.totalCheques,
    totalCarte: stats.totalCarte || 0,
    nbDons: stats.nbDons,
    nbPassages: stats.nbPassages,
    nbSecteursTotal: stats.nbSecteursTotal,
    nbSecteursTermines: stats.nbSecteursTermines,
    secteurs: secteurs.map(s => ({
      nom: s.nom,
      commune: s.commune,
      equipeNom: s.equipNom || null,
      totalCollecte: s.totalCollecte || 0,
      nbFoyersVisites: s.nbFoyersVisites || 0,
      nbFoyersAbsents: s.nbFoyersAbsents || 0,
      statut: s.statut
    })),
    equipes: stats.parEquipe.map(eq => ({
      nom: eq.nom,
      montant: eq.montant,
      nbPassages: eq.nbPassages
    }))
  };

  await fsSet(COLLECTION_HISTORIQUE, String(annee), snapshot);
  return snapshot;
}

// ── Réinitialiser les collections actives pour une nouvelle saison ──
// ⚠️ Supprime tous les secteurs, équipes et passages actuels
// À utiliser uniquement après avoir archivé la saison précédente
async function reinitialiserSaison() {
  const batch = writeBatch(db);

  const [secteursSnap, equipesSnap, passagesSnap] = await Promise.all([
    getDocs(collection(db, COLLECTIONS.SECTEURS)),
    getDocs(collection(db, COLLECTIONS.EQUIPES)),
    getDocs(collection(db, COLLECTIONS.PASSAGES))
  ]);

  let count = 0;
  secteursSnap.docs.forEach(d => { batch.delete(d.ref); count++; });
  equipesSnap.docs.forEach(d => { batch.delete(d.ref); count++; });
  passagesSnap.docs.forEach(d => { batch.delete(d.ref); count++; });

  // Firestore limite les batchs à 500 opérations ; au-delà, on découpe
  if (count <= 500) {
    await batch.commit();
  } else {
    // Fallback : suppression sans batch si trop de documents
    const allDocs = [...secteursSnap.docs, ...equipesSnap.docs, ...passagesSnap.docs];
    for (const d of allDocs) {
      await fsDelete(d.ref.parent.id, d.id);
    }
  }

  return count;
}

// ── Lire l'historique d'une année spécifique ────────────────────
async function lireSaison(annee) {
  return fsGet(COLLECTION_HISTORIQUE, String(annee));
}

// ── Lire toutes les années archivées ─────────────────────────────
async function lireToutesLesSaisons() {
  const saisons = await fsGetAll(COLLECTION_HISTORIQUE);
  return saisons.sort((a, b) => b.annee - a.annee); // plus récent en premier
}

// ── Saisie manuelle d'une saison passée (sans détail des passages) ──
// Utile pour intégrer des données récupérées auprès de l'amicale
// sans avoir à reconstituer tout l'historique des passages individuels
async function saisirSaisonManuelle({
  annee, totalCollecte, totalEspeces = 0, totalCheques = 0, totalCarte = 0,
  nbDons = 0, nbPassages = 0, secteurs = [], equipes = [], note = ""
}) {
  if (!annee || !/^\d{4}$/.test(String(annee))) {
    throw new Error("Année invalide");
  }
  const snapshot = {
    annee: Number(annee),
    dateArchivage: new Date().toISOString(),
    saisieManuelle: true,
    note,
    totalCollecte: Number(totalCollecte) || 0,
    totalEspeces: Number(totalEspeces) || 0,
    totalCheques: Number(totalCheques) || 0,
    totalCarte: Number(totalCarte) || 0,
    nbDons: Number(nbDons) || 0,
    nbPassages: Number(nbPassages) || 0,
    nbSecteursTotal: secteurs.length,
    nbSecteursTermines: secteurs.length,
    secteurs: secteurs.map(s => ({
      nom: s.nom || "",
      commune: s.commune || "",
      equipeNom: s.equipeNom || null,
      totalCollecte: Number(s.totalCollecte) || 0,
      nbFoyersVisites: 0,
      nbFoyersAbsents: 0,
      statut: "termine"
    })),
    equipes: equipes.map(eq => ({
      nom: eq.nom || "",
      montant: Number(eq.montant) || 0,
      nbPassages: Number(eq.nbPassages) || 0
    }))
  };
  await fsSet(COLLECTION_HISTORIQUE, String(annee), snapshot);
  return snapshot;
}

// ── Supprimer une saison archivée ────────────────────────────────
async function supprimerSaison(annee) {
  return fsDelete(COLLECTION_HISTORIQUE, String(annee));
}

// ── Comparer deux saisons ─────────────────────────────────────────
function comparerSaisons(saisonA, saisonB) {
  if (!saisonA || !saisonB) return null;

  const ecartTotal = saisonA.totalCollecte - saisonB.totalCollecte;
  const ecartPourcent = saisonB.totalCollecte > 0
    ? Math.round((ecartTotal / saisonB.totalCollecte) * 1000) / 10
    : null;

  // Comparaison par secteur (matching par nom de secteur)
  const secteursB = Object.fromEntries((saisonB.secteurs || []).map(s => [s.nom, s]));
  const comparaisonSecteurs = (saisonA.secteurs || []).map(sA => {
    const sB = secteursB[sA.nom];
    const ecart = sB ? sA.totalCollecte - sB.totalCollecte : null;
    const ecartPct = sB && sB.totalCollecte > 0
      ? Math.round((ecart / sB.totalCollecte) * 1000) / 10
      : null;
    return {
      nom: sA.nom,
      commune: sA.commune,
      montantA: sA.totalCollecte,
      montantB: sB ? sB.totalCollecte : null,
      ecart, ecartPct,
      tendance: ecart === null ? "nouveau" : ecart > 0 ? "hausse" : ecart < 0 ? "baisse" : "stable"
    };
  });

  // Comparaison par équipe (matching par nom)
  const equipesB = Object.fromEntries((saisonB.equipes || []).map(e => [e.nom, e]));
  const comparaisonEquipes = (saisonA.equipes || []).map(eA => {
    const eB = equipesB[eA.nom];
    const ecart = eB ? eA.montant - eB.montant : null;
    return {
      nom: eA.nom,
      montantA: eA.montant,
      montantB: eB ? eB.montant : null,
      ecart,
      tendance: ecart === null ? "nouveau" : ecart > 0 ? "hausse" : ecart < 0 ? "baisse" : "stable"
    };
  });

  return {
    anneeA: saisonA.annee,
    anneeB: saisonB.annee,
    totalA: saisonA.totalCollecte,
    totalB: saisonB.totalCollecte,
    ecartTotal,
    ecartPourcent,
    comparaisonSecteurs: comparaisonSecteurs.sort((a, b) => (b.ecart || 0) - (a.ecart || 0)),
    comparaisonEquipes: comparaisonEquipes.sort((a, b) => (b.ecart || 0) - (a.ecart || 0))
  };
}

