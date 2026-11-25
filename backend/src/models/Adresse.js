const mongoose = require("mongoose");
// US13 une adresse de livraison d'un client.
// enregistree = true : visible dans « Mes adresses enregistrées » (profil du client).
// enregistree = false : utilisée seulement pour le panier en cours.
const adresseSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    libelle: { type: String, trim: true, maxlength: 50, default: "" },
    rue: { type: String, required: true, trim: true, maxlength: 150 },
    complement: { type: String, trim: true, maxlength: 150, default: "" },
    ville: { type: String, required: true, trim: true, maxlength: 80 },
    codePostal: { type: String, required: true, match: /^\d{4}$/ },
    telephone: { type: String, required: true, match: /^\d{8}$/ },
    instructions: { type: String, trim: true, maxlength: 200, default: "" },
    enregistree: { type: Boolean, default: false },
  },
  { timestamps: true }
);


adresseSchema.index({ client: 1 });

module.exports = mongoose.models.Adresse || mongoose.model("Adresse", adresseSchema);