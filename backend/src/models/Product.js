const mongoose = require("mongoose");

// US06 T2 : un produit de la carte, rangé dans une catégorie.
const productSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    // Prix en millimes (entier strictement positif) : 12,500 TND -> 12500.
    prixMillimes: { type: Number, required: true, min: 1 },
    // Nom du fichier image dans le dossier uploads (null = image par défaut).
    image: { type: String, default: null },
    categorie: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    disponible: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
