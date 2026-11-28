// Outils communs aux tests des pages du Back-Office (US16, US17, US24).
// Ce fichier n'est pas un test : node --test ne le lance pas.
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../src/models/User");
const Commande = require("../src/models/Commande");

// Petit navigateur : garde le cookie de session et ne suit pas les redirections.
// Les données sont envoyées comme un formulaire HTML (ou en JSON avec json = true, pour la connexion).
// Renvoie { status, location, text } où text est la page HTML reçue.
function navigateurHtml(baseUrl) {
  let cookie = "";
  return async function appeler(methode, chemin, corps, json = false) {
    const entetes = {};
    if (cookie) entetes.Cookie = cookie;
    let donnees;
    if (corps !== undefined) {
      entetes["Content-Type"] = json ? "application/json" : "application/x-www-form-urlencoded";
      donnees = json ? JSON.stringify(corps) : new URLSearchParams(corps).toString();
    }
    const reponse = await fetch(baseUrl + chemin, { method: methode, redirect: "manual", headers: entetes, body: donnees });
    const setCookie = reponse.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0];
    return { status: reponse.status, location: reponse.headers.get("location"), text: await reponse.text() };
  };
}

// Crée un compte et renvoie { appeler, utilisateur } : un navigateur déjà connecté avec ce compte.
async function connecterBackOffice(baseUrl, role, email = `${role}@mail.com`) {
  const utilisateur = await User.create({
    nom: "Trabelsi",
    prenom: "Sami",
    email,
    telephone: "22000000",
    passwordHash: await bcrypt.hash("secret123", 4),
    role,
  });
  const appeler = navigateurHtml(baseUrl);
  await appeler("POST", "/api/auth/login", { email, password: "secret123" }, true);
  return { appeler, utilisateur };
}

// Le HTML écrit l'apostrophe « &#39; » : on la remet pour comparer avec un texte normal.
const texteBrut = (html) => html.replaceAll("&#39;", "'");

let compteur = 0;

// Crée une commande de test (2 pizzas + 1 menu = 31,000 TND) pour un client.
// `surcharge` remplace n'importe quel champ : statut, numero, historique, lignes...
// `creeeLe` fixe la date de création (pour tester le tri).
async function creerCommande(client, surcharge = {}) {
  compteur += 1;
  const { creeeLe, ...champs } = surcharge;
  const commande = await Commande.create({
    numero: `CMD-20261126-${String(compteur).padStart(4, "0")}`,
    client: client._id,
    cle: `cle-test-${compteur}-${Date.now()}`,
    lignes: [
      { type: "produit", refId: new mongoose.Types.ObjectId(), nom: "Pizza", quantite: 2, prixUnitaireMillimes: 12500, totalMillimes: 25000, choix: [] },
      {
        type: "menu",
        refId: new mongoose.Types.ObjectId(),
        nom: "Menu Etudiant",
        quantite: 1,
        prixUnitaireMillimes: 6000,
        totalMillimes: 6000,
        choix: [{ libelle: "Boisson", options: ["Jus d'orange"] }],
      },
    ],
    adresse: { libelle: "Maison", rue: "5 avenue Habib Bourguiba", ville: "Tunis", codePostal: "1000", telephone: "22000000" },
    totalMillimes: 31000,
    statut: "payee",
    historique: [{ statut: "payee" }],
    payeeLe: new Date(),
    ...champs,
  });
  // createdAt est géré par Mongoose : on le fixe directement dans la base.
  if (creeeLe) await Commande.collection.updateOne({ _id: commande._id }, { $set: { createdAt: creeeLe } });
  return commande;
}

module.exports = { navigateurHtml, connecterBackOffice, creerCommande, texteBrut };
