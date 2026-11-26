const mongoose = require("mongoose");

// Compteur atomique, par exemple "commande-20261125" -> 42.
// Sert à numéroter les commandes du jour sans doublon, même avec deux validations simultanées.
const compteurSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  valeur: { type: Number, default: 0 },
});

module.exports = mongoose.models.Compteur || mongoose.model("Compteur", compteurSchema);
