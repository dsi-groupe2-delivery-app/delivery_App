// US03 : création du compte de l'agent du restaurant.
// L'agent ne peut pas s'inscrire depuis le site : son compte est créé avec ce script.
//
// Utilisation (dans backend/) :
//   npm run create-admin -- <email> <motDePasse> <prenom> <nom>
// Exemple :
//   npm run create-admin -- agent@delivery.tn Agent2026 Sami Trabelsi
require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

async function main() {
  const [email, password, prenom = "Agent", nom = "Restaurant"] = process.argv.slice(2);

  if (!email || !password) {
    console.log("Utilisation : npm run create-admin -- <email> <motDePasse> [prenom] [nom]");
    process.exit(1);
  }

  // Même règle que pour l'inscription des clients
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    console.log("Mot de passe : 8 caractères minimum, au moins 1 lettre et 1 chiffre");
    process.exit(1);
  }

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.log("MONGO_URI manquant dans le fichier .env");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);

  if (await User.exists({ email: email.toLowerCase() })) {
    console.log(`Un compte existe déjà avec l'e-mail ${email}`);
  } else {
    await User.create({
      nom,
      prenom,
      email,
      telephone: "00000000",
      passwordHash: await bcrypt.hash(password, 10),
      role: "admin",
      actif: true,
    });
    console.log(`Compte agent créé : ${email}`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Erreur :", err.message);
  process.exit(1);
});
