// Outils communs aux tests de l'API carte et panier (US10, US11, US12).
// Ce fichier n'est pas un test : node --test ne le lance pas.
const bcrypt = require("bcryptjs");
const User = require("../src/models/User");

// Petit navigateur JSON : garde le cookie de session entre les appels.
// Renvoie { status, body } où body est le JSON de la réponse (ou null).
function navigateur(baseUrl) {
  let cookie = "";
  return async function appeler(methode, chemin, corps) {
    const entetes = { "Content-Type": "application/json" };
    if (cookie) entetes.Cookie = cookie;
    const reponse = await fetch(baseUrl + chemin, {
      method: methode,
      headers: entetes,
      body: corps === undefined ? undefined : JSON.stringify(corps),
    });
    const setCookie = reponse.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0];
    const texte = await reponse.text();
    let body = null;
    try {
      body = JSON.parse(texte);
    } catch {
      /* réponse non JSON */
    }
    return { status: reponse.status, body };
  };
}

// Crée un compte et renvoie un navigateur déjà connecté avec ce compte.
async function connecter(baseUrl, role, email = `${role}@mail.com`) {
  await User.create({
    nom: "Trabelsi",
    prenom: "Sami",
    email,
    telephone: "22000000",
    passwordHash: await bcrypt.hash("secret123", 4),
    role,
  });
  const appeler = navigateur(baseUrl);
  await appeler("POST", "/api/auth/login", { email, password: "secret123" });
  return appeler;
}

module.exports = { navigateur, connecter };
