// US16 : l'agent consulte les commandes payées et leur détail.
// US17 : l'agent valide une commande payée pour lancer sa préparation.
// Ce service prépare les données affichées par les pages EJS (montants en millimes, dates lisibles).
const repo = require("../repositories/commandeAgentRepository");
const commandeRepo = require("../repositories/commandeRepository");
const { LIBELLES_STATUT } = require("../models/Commande");
const { ErreurMetier } = require("../utils/erreurs");

// Tris proposés : valeur de ?tri= -> sens du tri sur la date.
const TRIS = { recent: -1, ancien: 1 };

// "26/11/2026 19:30" dans le fuseau de Tunis.
const formaterDate = (date) =>
  new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Africa/Tunis" }).format(date);

const nomClient = (client) => (client ? `${client.prenom} ${client.nom}` : "Client supprimé");

const adresseEnUneLigne = (a) => [a.rue, a.complement, `${a.codePostal} ${a.ville}`].filter(Boolean).join(", ");

// Liste des commandes payées. Un tri inconnu est remplacé par « plus récentes d'abord ».
async function listerPayees(tri) {
  const triChoisi = Object.hasOwn(TRIS, tri) ? tri : "recent";
  const commandes = await repo.payees(TRIS[triChoisi]);
  return {
    tri: triChoisi,
    commandes: commandes.map((c) => ({
      numero: c.numero,
      date: formaterDate(c.createdAt),
      client: nomClient(c.client),
      adresse: adresseEnUneLigne(c.adresse),
      totalMillimes: c.totalMillimes,
    })),
  };
}

// Détail d'une commande, ou null si elle n'existe pas.
async function detailCommande(numero) {
  const c = await repo.parNumero(numero);
  if (!c) return null;
  return {
    numero: c.numero,
    statut: c.statut,
    libelleStatut: LIBELLES_STATUT[c.statut] || c.statut,
    date: formaterDate(c.createdAt),
    payeeLe: c.payeeLe ? formaterDate(c.payeeLe) : null,
    client: {
      nom: nomClient(c.client),
      email: c.client ? c.client.email : "",
      telephone: c.client ? c.client.telephone : "",
    },
    adresse: { ...c.adresse, uneLigne: adresseEnUneLigne(c.adresse) },
    // Le prix d'une ligne de menu comprend déjà les suppléments des options choisies.
    lignes: c.lignes.map((l) => ({
      type: l.type,
      nom: l.nom,
      quantite: l.quantite,
      prixUnitaireMillimes: l.prixUnitaireMillimes,
      totalMillimes: l.totalMillimes,
      choix: (l.choix || []).map((g) => ({ libelle: g.libelle, options: g.options })),
    })),
    totalMillimes: c.totalMillimes,
  };
}

// ---------- US17 : valider une commande payée ----------

// Statuts atteints après la validation : la commande a déjà été validée.
const DEJA_VALIDEES = ["en_preparation", "prete", "en_livraison", "livree"];

function refus(statut) {
  const libelle = LIBELLES_STATUT[statut] || statut;
  if (DEJA_VALIDEES.includes(statut)) {
    return new ErreurMetier(409, `Cette commande a déjà été validée (statut actuel : ${libelle})`);
  }
  return new ErreurMetier(409, `Seules les commandes payées peuvent être validées (statut actuel : ${libelle})`);
}

// « Payée » -> « En préparation ». Renvoie la commande mise à jour.
// Erreurs : 404 (numéro inconnu), 409 (pas payée, ou déjà validée).
async function validerCommande(numero) {
  const commande = await repo.parNumero(numero);
  if (!commande) throw new ErreurMetier(404, "Commande introuvable");
  if (commande.statut !== "payee") throw refus(commande.statut);

  // Changement atomique : seulement si la commande est encore « Payée ».
  // Deux agents qui cliquent en même temps : un seul passe, l'autre reçoit le message « déjà validée ».
  // Le changement est aussi ajouté à l'historique de la commande (date et statut).
  const validee = await commandeRepo.changerStatutSi(commande._id, "payee", "en_preparation");
  if (!validee) {
    const actuelle = await repo.parNumero(numero);
    throw refus(actuelle ? actuelle.statut : commande.statut);
  }
  return validee;
}

module.exports = { listerPayees, detailCommande, validerCommande };