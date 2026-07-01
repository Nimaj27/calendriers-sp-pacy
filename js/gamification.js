// ============================================================
// gamification.js — Badges, paliers et classement ludique
// Amicale SP Pacy-sur-Eure — Tournée Calendriers
// ============================================================

// ── Paliers de progression (basés sur % de secteurs terminés par l'équipe) ──
const PALIERS = [
  { seuil: 100, icone: "🏆", label: "Champion",  couleur: "#EAB308" },
  { seuil: 75,  icone: "🥇", label: "Or",        couleur: "#F59E0B" },
  { seuil: 50,  icone: "🥈", label: "Argent",    couleur: "#9CA3AF" },
  { seuil: 25,  icone: "🥉", label: "Bronze",    couleur: "#B45309" },
  { seuil: 0,   icone: "🔰", label: "Débutant",  couleur: "#6B7280" }
];

function getPalier(pourcentComplete) {
  return PALIERS.find(p => pourcentComplete >= p.seuil) || PALIERS[PALIERS.length - 1];
}

// ── Calcul du % de complétion d'une équipe (secteurs terminés / secteurs assignés) ──
function pourcentCompletionEquipe(equipeId, secteurs) {
  const secteursEquipe = secteurs.filter(s => s.equipeId === equipeId);
  if (secteursEquipe.length === 0) return 0;
  const termines = secteursEquipe.filter(s => s.statut === "termine").length;
  return Math.round((termines / secteursEquipe.length) * 100);
}

// ── Définition des badges de mérite ─────────────────────────────
// Chaque badge a une fonction `test(contexte)` qui retourne true/false
const BADGES = [
  {
    id: "pionnier",
    icone: "🚀",
    nom: "Pionnier",
    description: "Première équipe à clôturer un secteur",
    test: (eq, ctx) => ctx.premierATerminer === eq.id
  },
  {
    id: "top_collecteur",
    icone: "💰",
    nom: "Top collecteur",
    description: "Équipe en tête du classement",
    test: (eq, ctx) => ctx.classement[0]?.id === eq.id && ctx.classement[0]?.montant > 0
  },
  {
    id: "sans_faute",
    icone: "🎯",
    nom: "Sans faute",
    description: "Meilleur taux de dons (peu de refus)",
    test: (eq, ctx) => {
      if (eq.nbPassages < 5) return false;
      const tauxRefus = eq.nbRefus / eq.nbPassages;
      return ctx.meilleurTauxRefus !== null && tauxRefus === ctx.meilleurTauxRefus && tauxRefus < 0.15;
    }
  },
  {
    id: "serie_3",
    icone: "🔥",
    nom: "Série de 3",
    description: "3 secteurs ou plus terminés",
    test: (eq, ctx) => ctx.secteursTerminesParEquipe[eq.id] >= 3
  },
  {
    id: "palier_500",
    icone: "🌟",
    nom: "Cap des 500€",
    description: "A dépassé 500€ collectés",
    test: (eq) => eq.montant >= 500
  },
  {
    id: "palier_1000",
    icone: "💎",
    nom: "Cap des 1000€",
    description: "A dépassé 1000€ collectés",
    test: (eq) => eq.montant >= 1000
  },
  {
    id: "complet",
    icone: "🏁",
    nom: "Mission accomplie",
    description: "100% des secteurs assignés terminés",
    test: (eq, ctx) => ctx.pourcentParEquipe[eq.id] === 100 && ctx.secteursParEquipe[eq.id] > 0
  }
];

// ── Calculer tous les badges débloqués pour chaque équipe ──────
// Prend en entrée : liste équipes (avec stats), liste secteurs, liste passages
function calculerBadges(parEquipe, secteurs, passages) {
  // Construire le contexte global nécessaire aux tests des badges
  const classement = [...parEquipe].sort((a, b) => b.montant - a.montant);

  const secteursTerminesParEquipe = {};
  const secteursParEquipe = {};
  const pourcentParEquipe = {};
  parEquipe.forEach(eq => {
    const secteursEq = secteurs.filter(s => s.equipeId === eq.id);
    secteursParEquipe[eq.id] = secteursEq.length;
    secteursTerminesParEquipe[eq.id] = secteursEq.filter(s => s.statut === "termine").length;
    pourcentParEquipe[eq.id] = pourcentCompletionEquipe(eq.id, secteurs);
  });

  // Premier secteur terminé (par dateFin la plus ancienne)
  const secteursTermines = secteurs
    .filter(s => s.statut === "termine" && s.dateFin)
    .sort((a, b) => new Date(a.dateFin) - new Date(b.dateFin));
  const premierATerminer = secteursTermines[0]?.equipeId || null;

  // Taux de refus par équipe (pour le badge "sans faute")
  const tauxRefusParEquipe = parEquipe.map(eq => {
    if (!eq.nbPassages || eq.nbPassages < 5) return null;
    return (eq.nbRefus || 0) / eq.nbPassages;
  }).filter(t => t !== null);
  const meilleurTauxRefus = tauxRefusParEquipe.length > 0 ? Math.min(...tauxRefusParEquipe) : null;

  const ctx = {
    classement,
    secteursTerminesParEquipe,
    secteursParEquipe,
    pourcentParEquipe,
    premierATerminer,
    meilleurTauxRefus
  };

  // Calculer les badges débloqués pour chaque équipe
  const resultats = {};
  parEquipe.forEach(eq => {
    resultats[eq.id] = BADGES.filter(badge => {
      try { return badge.test(eq, ctx); } catch(e) { return false; }
    });
  });

  return resultats;
}

// ── Détection de nouveaux déblocages (comparaison avant/après) ──
// Utile pour déclencher un toast "Nouveau badge débloqué !"
function detecterNouveauxBadges(badgesAvant, badgesApres) {
  const nouveaux = [];
  for (const equipeId in badgesApres) {
    const avantIds = (badgesAvant[equipeId] || []).map(b => b.id);
    const apresIds = badgesApres[equipeId];
    apresIds.forEach(badge => {
      if (!avantIds.includes(badge.id)) {
        nouveaux.push({ equipeId, badge });
      }
    });
  }
  return nouveaux;
}

// ── Podium top 3 ──────────────────────────────────────────────
function getPodium(parEquipe) {
  return [...parEquipe]
    .sort((a, b) => b.montant - a.montant)
    .slice(0, 3);
}

