const mongoose = require("mongoose");

// Rôles de l'application (backlog US01 T1) : "admin" = l'agent du restaurant.
const ROLES = ["client", "admin", "livreur"];

const userSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true, trim: true },
    prenom: { type: String, required: true, trim: true },
    // Unique et normalisé en minuscules : "Amira@Mail.com" et "amira@mail.com" sont le même compte.
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    telephone: { type: String, required: true, trim: true },
    // Jamais renvoyé par défaut : il faut le demander avec .select("+passwordHash").
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true, default: "client" },
    // Un compte inactif ne peut pas se connecter (US02).
    actif: { type: Boolean, default: true },
    //aprés premier connexion livreur doit changer son mdp mais pas client
    doitChangerMotDePasse: {
  type: Boolean,
  default: false
},
  },
  { timestamps: true }
);

// Sécurité supplémentaire : le hash ne sort jamais en JSON, même s'il a été sélectionné.
userSchema.set("toJSON", {
  transform(doc, ret) {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
module.exports.ROLES = ROLES;
