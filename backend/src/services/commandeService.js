// US14 (valider le panier) : règles métier des commandes.
// Le serveur est seul juge : le contenu et le total viennent du panier recalculé, jamais du navigateur.
const repo = require("../repositories/commandeRepository");
const cartRepo = require("../repositories/cartRepository");
const { lirePanier } = require("./cartService");
const { ErreurMetier } = require("../utils/erreurs");
const { LIBELLES_STATUT } = require("../models/Commande");

const enMillimes = (tnd) => Math.round(Number(tnd) * 1000);

// "20261125" dans le fuseau de Tunis (la journée du restaurant).
function jourTunis(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Tunis" }).format(date).replaceAll("-", "");
}

// Ce que l'API renvoie au navigateur (montants en TND, comme le panier).
function vueCommande(c) {
  return {
    _id: c._id,
    numero: c.numero,
    statut: c.statut,
    libelleStatut: LIBELLES_STATUT[c.statut],
    lignes: c.lignes.map((l) => ({
      type: l.type,
      nom: l.nom,
      quantite: l.quantite,
      prixUnitaire: l.prixUnitaireMillimes / 1000,
      totalLigne: l.totalMillimes / 1000,
      choix: l.choix.map((ch) => ({ libelle: ch.libelle, options: ch.options })),
    })),
    nombreArticles: c.lignes.reduce((n, l) => n + l.quantite, 0),
    adresse: c.adresse,
    total: c.totalMillimes / 1000,
    creeeLe: c.createdAt,
  };
}

// ---------- US14 : valider le panier ----------

// Vérifie le panier recalculé par le serveur. Lance une erreur 409 si le client doit revoir son panier.
function verifierPanier(vue) {
  if (!vue.lignes.length) throw new ErreurMetier(400, "Votre panier est vide");

  // Article indisponible ou prix modifié depuis que le client l'a vu : retour au panier.
  const alertes = vue.lignes.flatMap((l) => l.alertes.map((a) => `${l.nom} : ${a.message}`));
  if (alertes.length) {
    throw new ErreurMetier(
      409,
      "Votre panier a changé (article indisponible ou prix modifié). Vérifiez-le avant de valider.",
      alertes
    );
  }
  if (!vue.adresse) throw new ErreurMetier(400, "Choisissez une adresse de livraison avant de valider");
}

// POST /api/commandes : crée la commande à partir du panier du client, puis vide le panier.
// `cle` vient du navigateur : la même clé renvoie la même commande (double clic, réseau lent).
async function validerPanier(clientId, cle) {
  const dejaCreee = await repo.parCle(clientId, cle);
  if (dejaCreee) return { commande: vueCommande(dejaCreee), creee: false };

  const vue = await lirePanier(clientId);
  verifierPanier(vue);

  const lignes = vue.lignes.map((l) => ({
    type: l.type,
    refId: l.refId,
    nom: l.nom,
    quantite: l.quantite,
    prixUnitaireMillimes: enMillimes(l.prixUnitaire),
    totalMillimes: enMillimes(l.totalLigne),
    choix: l.choix.map((g) => ({ libelle: g.libelle, options: g.options.map((o) => o.nom) })),
  }));
  const { _id, enregistree, ...adresse } = vue.adresse;

  const jour = jourTunis();
  const rang = await repo.prochainNumeroDuJour(jour);

  let commande;
  try {
    commande = await repo.creer({
      numero: `CMD-${jour}-${String(rang).padStart(4, "0")}`,
      client: clientId,
      cle,
      lignes,
      adresse,
      totalMillimes: enMillimes(vue.total),
      statut: "en_attente_paiement",
      historique: [{ statut: "en_attente_paiement", date: new Date() }],
    });
  } catch (err) {
    // Deux requêtes simultanées avec la même clé : l'index unique garde une seule commande.
    if (err && err.code === 11000) {
      const existante = await repo.parCle(clientId, cle);
      if (existante) return { commande: vueCommande(existante), creee: false };
    }
    throw err;
  }

  // La commande est créée : le panier repart à zéro (articles et adresse).
  const panier = await cartRepo.trouverParClient(clientId);
  if (panier) {
    panier.lignes = [];
    panier.adresse = null;
    await panier.save();
  }

  return { commande: vueCommande(commande), creee: true };
}

// GET /api/commandes/:numero : une commande du client connecté (404 pour celle d'un autre).
async function lireCommande(clientId, numero) {
  const commande = await repo.duClient(numero, clientId);
  if (!commande) throw new ErreurMetier(404, "Commande introuvable");
  return vueCommande(commande);
}

module.exports = { validerPanier, lireCommande, vueCommande, jourTunis };
