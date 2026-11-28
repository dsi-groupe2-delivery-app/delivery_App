// Tests US24 (l'agent modifie les livreurs), sur une base MongoDB en mémoire.
const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { MongoMemoryServer } = require("mongodb-memory-server");

const app = require("../src/app");
const User = require("../src/models/User");
const { validerLivreur } = require("../src/validators/livreur");

let mongod;
let server;
let baseUrl;

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await User.init();
  server = app.listen(0);
  baseUrl = `http://localhost:${server.address().port}`;
});

after(async () => {
  server.closeAllConnections();
  server.close();
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
});

// Petit navigateur : garde le cookie de session et ne suit pas les redirections.
// Les données sont envoyées comme un formulaire HTML (ou en JSON avec json = true, pour la connexion).
function navigateur() {
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

// Crée un compte (client, agent ou livreur).
async function creerCompte(role, email, champs = {}) {
  return User.create({
    nom: "Trabelsi",
    prenom: "Sami",
    email,
    telephone: "22000000",
    passwordHash: await bcrypt.hash("secret123", 4),
    role,
    ...champs,
  });
}

// Crée un compte et renvoie un navigateur déjà connecté avec ce compte.
async function connecter(role) {
  const email = `${role}@mail.com`;
  await creerCompte(role, email);
  const appeler = navigateur();
  await appeler("POST", "/api/auth/login", { email, password: "secret123" }, true);
  return appeler;
}

// Le HTML écrit l'apostrophe « &#39; » : on la remet pour comparer avec un texte normal.
const texteBrut = (html) => html.replaceAll("&#39;", "'");

const modifier = (appeler, livreur, champs) =>
  appeler("POST", `/admin/equipe-livreurs/${livreur._id}?_method=PUT`, champs);

// ---------- Contrôle de saisie (sans base de données) ----------

test("US24 validation : champs obligatoires, formats, espaces du téléphone acceptés", () => {
  const vide = validerLivreur({ nom: "  ", prenom: "", telephone: "" });
  assert.deepStrictEqual(Object.keys(vide.erreurs).sort(), ["nom", "prenom", "telephone"]);

  const mauvais = validerLivreur({ nom: "B3n", prenom: "A", telephone: "123" });
  assert.match(mauvais.erreurs.nom, /Lettres/);
  assert.match(mauvais.erreurs.prenom, /Entre 2 et 50/);
  assert.match(mauvais.erreurs.telephone, /8 chiffres/);

  const valide = validerLivreur({ nom: " Ben Salah ", prenom: "Jean-Pierre", telephone: "22 000 111" });
  assert.deepStrictEqual(valide.erreurs, {});
  assert.deepStrictEqual(valide.donnees, { nom: "Ben Salah", prenom: "Jean-Pierre", telephone: "22000111" });

  assert.deepStrictEqual(validerLivreur({ nom: "O'Brien", prenom: "Zoé", telephone: "99887766" }).erreurs, {});
  assert.ok(validerLivreur({ nom: ["a", "b"], prenom: "Zoé", telephone: "99887766" }).erreurs.nom); // champ répété
});

// ---------- Accès ----------

test("US24 accès : visiteur redirigé, client et livreur refusés (403), agent autorisé", async () => {
  const cible = await creerCompte("livreur", "cible@mail.com");
  const client = await connecter("client");
  const livreur = await connecter("livreur");
  const agent = await connecter("admin");
  const pages = [
    ["GET", "/admin/equipe-livreurs"],
    ["GET", `/admin/equipe-livreurs/${cible._id}/edit`],
  ];

  for (const [methode, chemin] of pages) {
    const visiteur = await navigateur()(methode, chemin);
    assert.strictEqual(visiteur.status, 302);
    assert.strictEqual(visiteur.location, "/admin/connexion");
    assert.strictEqual((await client(methode, chemin)).status, 403);
    assert.strictEqual((await livreur(methode, chemin)).status, 403);
    assert.strictEqual((await agent(methode, chemin)).status, 200);
  }

  // La modification est refusée aussi : rien n'est enregistré.
  const champs = { nom: "Pirate", prenom: "Intrus", telephone: "11111111" };
  assert.strictEqual((await modifier(navigateur(), cible, champs)).status, 302);
  assert.strictEqual((await modifier(client, cible, champs)).status, 403);
  assert.strictEqual((await modifier(livreur, cible, champs)).status, 403);
  assert.strictEqual((await User.findById(cible._id)).nom, "Trabelsi");
});

// ---------- Liste ----------

test("US24 liste : seulement les livreurs, triés par nom, avec leurs informations", async () => {
  await creerCompte("livreur", "zied@mail.com", { nom: "Zouari", prenom: "Zied", telephone: "55111222" });
  await creerCompte("livreur", "amel@mail.com", { nom: "Ayari", prenom: "Amel", telephone: "99333444", actif: false });
  await creerCompte("client", "client@mail.com", { nom: "Clientnom", prenom: "Clara" });
  const agent = await connecter("admin");

  const page = await agent("GET", "/admin/equipe-livreurs");
  const texte = texteBrut(page.text);
  assert.strictEqual(page.status, 200);
  assert.ok(texte.includes("Ayari") && texte.includes("amel@mail.com") && texte.includes("99333444"));
  assert.ok(texte.includes("Zouari") && texte.includes("55111222"));
  assert.ok(texte.indexOf("Ayari") < texte.indexOf("Zouari")); // tri par nom
  assert.ok(texte.includes("Désactivé")); // compte inactif signalé
  assert.ok(!texte.includes("Clientnom")); // ni les clients...
  assert.ok(!texte.includes("admin@mail.com")); // ... ni l'agent
});

test("US24 liste vide : un message informatif est affiché", async () => {
  const agent = await connecter("admin");
  const page = await agent("GET", "/admin/equipe-livreurs");
  assert.strictEqual(page.status, 200);
  assert.ok(texteBrut(page.text).includes("Aucun livreur enregistré pour le moment"));
});

// ---------- Formulaire et modification ----------

test("US24 formulaire : pré-rempli avec les valeurs actuelles", async () => {
  const livreur = await creerCompte("livreur", "amel@mail.com", { nom: "Ayari", prenom: "Amel", telephone: "99333444" });
  const agent = await connecter("admin");

  const page = await agent("GET", `/admin/equipe-livreurs/${livreur._id}/edit`);
  assert.strictEqual(page.status, 200);
  assert.ok(page.text.includes('value="Ayari"'));
  assert.ok(page.text.includes('value="Amel"'));
  assert.ok(page.text.includes('value="99333444"'));
  assert.ok(page.text.includes("amel@mail.com"));
});

test("US24 modification valide : enregistrée, message de confirmation, le reste du compte intact", async () => {
  const livreur = await creerCompte("livreur", "amel@mail.com", { nom: "Ayari", prenom: "Amel", telephone: "99333444" });
  const avant = await User.findById(livreur._id).select("+passwordHash");
  const agent = await connecter("admin");

  const reponse = await modifier(agent, livreur, { nom: "Ben Ayari", prenom: "Amel-Sarra", telephone: "22 000 111" });
  assert.strictEqual(reponse.status, 302);
  assert.strictEqual(reponse.location, "/admin/equipe-livreurs");

  const apres = await User.findById(livreur._id).select("+passwordHash");
  assert.strictEqual(apres.nom, "Ben Ayari");
  assert.strictEqual(apres.prenom, "Amel-Sarra");
  assert.strictEqual(apres.telephone, "22000111");
  // E-mail, rôle, mot de passe et état du compte ne changent pas.
  assert.strictEqual(apres.email, "amel@mail.com");
  assert.strictEqual(apres.role, "livreur");
  assert.strictEqual(apres.passwordHash, avant.passwordHash);
  assert.strictEqual(apres.actif, true);

  const liste = texteBrut((await agent("GET", "/admin/equipe-livreurs")).text);
  assert.ok(liste.includes("Livreur « Amel-Sarra Ben Ayari » modifié avec succès"));
  assert.ok(liste.includes("22000111"));
  // Le message ne s'affiche qu'une fois.
  assert.ok(!texteBrut((await agent("GET", "/admin/equipe-livreurs")).text).includes("modifié avec succès"));
});

test("US24 modification invalide : erreurs par champ, saisie conservée, rien n'est enregistré", async () => {
  const livreur = await creerCompte("livreur", "amel@mail.com", { nom: "Ayari", prenom: "Amel", telephone: "99333444" });
  const agent = await connecter("admin");

  const vide = await modifier(agent, livreur, { nom: "", prenom: "", telephone: "" });
  assert.strictEqual(vide.status, 400);
  assert.strictEqual((vide.text.match(/Ce champ est obligatoire/g) || []).length, 3);

  const mauvais = await modifier(agent, livreur, { nom: "Nouveau", prenom: "A1", telephone: "abc" });
  assert.strictEqual(mauvais.status, 400);
  assert.ok(texteBrut(mauvais.text).includes("Lettres, espaces, apostrophes et tirets uniquement"));
  assert.ok(texteBrut(mauvais.text).includes("Le téléphone doit contenir 8 chiffres"));
  assert.ok(mauvais.text.includes('value="Nouveau"')); // ce que l'agent a tapé est conservé

  const enBase = await User.findById(livreur._id);
  assert.deepStrictEqual([enBase.nom, enBase.prenom, enBase.telephone], ["Ayari", "Amel", "99333444"]);
});

test("US24 champs protégés : e-mail, rôle et mot de passe envoyés dans le formulaire sont ignorés", async () => {
  const livreur = await creerCompte("livreur", "amel@mail.com");
  const agent = await connecter("admin");

  const reponse = await modifier(agent, livreur, {
    nom: "Ayari",
    prenom: "Amel",
    telephone: "99333444",
    email: "pirate@mail.com",
    role: "admin",
    actif: "false",
  });
  assert.strictEqual(reponse.status, 302);

  const enBase = await User.findById(livreur._id);
  assert.strictEqual(enBase.email, "amel@mail.com");
  assert.strictEqual(enBase.role, "livreur");
  assert.strictEqual(enBase.actif, true);
});

// ---------- Livreur inexistant ----------

test("US24 livreur inexistant : 404, rien n'est modifié (id inconnu, mal formé, ou compte qui n'est pas livreur)", async () => {
  const client = await creerCompte("client", "client@mail.com", { nom: "Clientnom" });
  const agent = await connecter("admin");
  const champs = { nom: "Pirate", prenom: "Intrus", telephone: "11111111" };
  const inconnu = { _id: new mongoose.Types.ObjectId() };

  for (const cible of [inconnu, { _id: "pas-un-id" }, client]) {
    assert.strictEqual((await agent("GET", `/admin/equipe-livreurs/${cible._id}/edit`)).status, 404);
    assert.strictEqual((await modifier(agent, cible, champs)).status, 404);
  }
  assert.strictEqual((await User.findById(client._id)).nom, "Clientnom"); // un client ne peut pas être modifié ici
});
