const mongoose = require("mongoose");

// US06 T1 : une catégorie de la carte (Entrées, Plats, Desserts...).
const categorySchema = new mongoose.Schema(
  {
    nom: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
    // Copie du nom en minuscules : sert à refuser "Desserts" si "desserts" existe déjà.
    nomMinuscule: { type: String, unique: true },
    // Ordre d'affichage sur la carte (facultatif) : la plus petite valeur en premier.
    ordre: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Rempli automatiquement avant chaque enregistrement.
categorySchema.pre("validate", function () {
  if (this.nom) this.nomMinuscule = this.nom.trim().toLowerCase();
});

module.exports = mongoose.model("Category", categorySchema);
