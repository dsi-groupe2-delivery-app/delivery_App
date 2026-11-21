const mongoose = require("mongoose");

// US11 T1 : le panier d'un client (un seul panier par client).
// On ne stocke que des références et des choix : le nom, la disponibilité et le prix
// sont relus à chaque consultation (US12), jamais pris sur la foi du navigateur.

// Choix d'un groupe d'un menu composé : { groupe: id du groupe, produits: [ids choisis] }.
const choixSchema = new mongoose.Schema(
  {
    groupe: { type: mongoose.Schema.Types.ObjectId, required: true },
    produits: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  },
  { _id: false }
);

const ligneSchema = new mongoose.Schema({
  type: { type: String, enum: ["produit", "menu"], required: true },
  produit: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  menu: { type: mongoose.Schema.Types.ObjectId, ref: "MenuCompose" },
  quantite: {
    type: Number,
    required: true,
    min: 1,
    max: 20,
    validate: { validator: Number.isInteger, message: "La quantité doit être un entier" },
  },
  choix: [choixSchema],
  // Prix unitaire (en millimes) vu par le client à son dernier ajout ou modification.
  // Sert à signaler « le prix a changé » quand l'agent modifie un prix (US12).
  prixUnitaireMillimes: { type: Number, required: true, min: 0 },
});

const cartSchema = new mongoose.Schema(
  {
    // unique : un client = un panier. Index défini dès la création du modèle (règle Cosmos DB).
    client: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    lignes: [ligneSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.models.Cart || mongoose.model("Cart", cartSchema);
