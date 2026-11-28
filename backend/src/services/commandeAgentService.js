// US16 : l'agent consulte les commandes payées et leur détail.
// Ce service prépare les données affichées par les pages EJS (montants en millimes, dates lisibles).
const repo = require("../repositories/commandeAgentRepository");
const { LIBELLES_STATUT } = require("../models/Commande");

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

module.exports = { listerPayees, detailCommande };
