const mongoose = require("mongoose");

// US14 / US15 : une commande passée par un client.
// Tout ce qu'elle contient est une COPIE figée au moment de la validation du panier :
// si l'agent change un prix ou un nom plus tard, la commande ne bouge pas.
//
// Statuts (diagramme d'états-transitions de la commande) :
//   en_attente_paiement -> payee -> en_preparation -> prete -> en_livraison -> livree
//   en_attente_paiement -> annulee (paiement abandonné)
// Les stories suivantes font avancer le statut avec changerStatut() (services/commandeService.js).
const STATUTS = ["en_attente_paiement", "payee", "en_preparation", "prete", "en_livraison", "livree", "annulee"];

const LIBELLES_STATUT = {
  en_attente_paiement: "En attente de paiement",
  payee: "Payée",
  en_preparation: "En préparation",
  prete: "Prête",
  en_livraison: "En livraison",
  livree: "Livrée",
  annulee: "Annulée",
};

const ligneSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["produit", "menu"], required: true },
    // Produit ou menu d'origine (pour retrouver l'article ; le nom et le prix sont copiés ci-dessous).
    refId: { type: mongoose.Schema.Types.ObjectId, required: true },
    nom: { type: String, required: true },
    quantite: { type: Number, required: true, min: 1 },
    prixUnitaireMillimes: { type: Number, required: true, min: 0 },
    totalMillimes: { type: Number, required: true, min: 0 },
    // Choix d'un menu composé : [{ libelle: "Boisson", options: ["Jus d'orange"] }].
    choix: [{ _id: false, libelle: String, options: [String] }],
  },
  { _id: false }
);

// Adresse copiée depuis le panier (US13) : la commande garde l'adresse du jour de la commande.
const adresseSchema = new mongoose.Schema(
  {
    libelle: String,
    rue: { type: String, required: true },
    complement: String,
    ville: { type: String, required: true },
    codePostal: { type: String, required: true },
    telephone: { type: String, required: true },
    instructions: String,
  },
  { _id: false }
);

// US15 : trace de chaque tentative de paiement. Jamais de numéro de carte complet ni de CVV.
const transactionSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true },
    moyen: { type: String, required: true },
    statut: { type: String, enum: ["acceptee", "refusee"], required: true },
    montantMillimes: { type: Number, required: true },
    derniers4: String,
    motif: String,
    date: { type: Date, default: Date.now },
  },
  { _id: false }
);

const commandeSchema = new mongoose.Schema(
  {
    // CMD-AAAAMMJJ-NNNN, unique.
    numero: { type: String, required: true, unique: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // Clé envoyée par le navigateur à la validation : un double clic ne crée qu'une commande.
    cle: { type: String, required: true },
    lignes: { type: [ligneSchema], validate: [(v) => v.length > 0, "Commande vide"] },
    adresse: { type: adresseSchema, required: true },
    totalMillimes: { type: Number, required: true, min: 0 },
    statut: { type: String, enum: STATUTS, default: "en_attente_paiement" },
    // Chaque changement de statut est enregistré (qui l'a fait n'est pas requis au Sprint 2).
    historique: [{ _id: false, statut: { type: String, enum: STATUTS }, date: { type: Date, default: Date.now } }],
    transactions: [transactionSchema],
    payeeLe: { type: Date, default: null },
  },
  { timestamps: true }
);

// Index déclarés dans le modèle (règle de l'équipe pour Cosmos DB).
// US14/US15 ne font aucun .sort() : ces index préparent les listes des autres stories.
// Règle : chaque nouveau .sort() doit avoir un index avec EXACTEMENT les mêmes champs
// (ex. .sort({ createdAt: -1 }) seul -> ajouter commandeSchema.index({ createdAt: -1 })).
commandeSchema.index({ client: 1, cle: 1 }, { unique: true }); // anti double clic (US14)
commandeSchema.index({ client: 1, createdAt: -1 }); // commandes d'un client, plus récentes d'abord
commandeSchema.index({ statut: 1, createdAt: 1 }); // listes de l'agent par statut

module.exports = mongoose.models.Commande || mongoose.model("Commande", commandeSchema);
module.exports.STATUTS = STATUTS;
module.exports.LIBELLES_STATUT = LIBELLES_STATUT;
