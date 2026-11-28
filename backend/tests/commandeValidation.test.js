// Tests US17 (l'agent valide une commande payée), sur une base MongoDB en mémoire.
const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const app = require("../src/app");
const User = require("../src/models/User");
const Commande = require("../src/models/Commande");
const { connecter } = require("./aide-api");
const { navigateurHtml, connecterBackOffice, creerCommande, texteBrut } = require("./aide-backoffice");

let mongod;
let server;
let baseUrl;

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await Promise.all([User.init(), Commande.init()]);
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
  await Promise.all([User.deleteMany({}), Commande.deleteMany({})]);
});

const validation = (commande) => `/admin/commandes/${commande.numero}/validation`;

// ---------- Accès ----------

test("US17 accès : visiteur redirigé, client et livreur refusés (403), rien n'est modifié", async () => {
  const { appeler: client, utilisateur } = await connecterBackOffice(baseUrl, "client");
  const { appeler: livreur } = await connecterBackOffice(baseUrl, "livreur");
  const commande = await creerCommande(utilisateur);

  const visiteur = await navigateurHtml(baseUrl)("POST", validation(commande), {});
  assert.strictEqual(visiteur.status, 302);
  assert.strictEqual(visiteur.location, "/admin/connexion");
  assert.strictEqual((await client("POST", validation(commande), {})).status, 403);
  assert.strictEqual((await livreur("POST", validation(commande), {})).status, 403);

  assert.strictEqual((await Commande.findById(commande._id)).statut, "payee");
});

// ---------- Détail avant la validation ----------

test("US17 détail : le bouton « Valider » n'apparaît que pour une commande payée", async () => {
  const { utilisateur } = await connecterBackOffice(baseUrl, "client");
  const { appeler: agent } = await connecterBackOffice(baseUrl, "admin");
  const payee = await creerCommande(utilisateur);
  const enPreparation = await creerCommande(utilisateur, { statut: "en_preparation" });

  const pagePayee = texteBrut((await agent("GET", `/admin/commandes/${payee.numero}`)).text);
  assert.ok(pagePayee.includes("Valider la commande"));
  assert.ok(pagePayee.includes(`/admin/commandes/${payee.numero}/validation`));
  assert.ok(pagePayee.includes("Pizza")); // l'agent voit le détail avant de valider

  const pageValidee = texteBrut((await agent("GET", `/admin/commandes/${enPreparation.numero}`)).text);
  assert.ok(!pageValidee.includes("Valider la commande"));
  assert.ok(pageValidee.includes("n'est plus à valider"));
});

// ---------- Validation ----------

test("US17 validation : « Payée » devient « En préparation », message de confirmation, historique", async () => {
  const { utilisateur } = await connecterBackOffice(baseUrl, "client");
  const { appeler: agent } = await connecterBackOffice(baseUrl, "admin");
  const commande = await creerCommande(utilisateur);

  const reponse = await agent("POST", validation(commande), {});
  assert.strictEqual(reponse.status, 302);
  assert.strictEqual(reponse.location, `/admin/commandes/${commande.numero}`);

  const enBase = await Commande.findById(commande._id);
  assert.strictEqual(enBase.statut, "en_preparation");
  // Le changement est enregistré dans l'historique de la commande.
  assert.deepStrictEqual(
    enBase.historique.map((h) => h.statut),
    ["payee", "en_preparation"]
  );

  // La page de détail affiche le message de confirmation et le nouveau statut, sans le bouton « Valider ».
  const detail = texteBrut((await agent("GET", reponse.location)).text);
  assert.ok(detail.includes(`Commande ${commande.numero} validée : elle passe « En préparation »`));
  assert.ok(detail.includes("En préparation"));
  assert.ok(!detail.includes("Valider la commande"));
  // Le message ne s'affiche qu'une fois.
  assert.ok(!texteBrut((await agent("GET", reponse.location)).text).includes("elle passe"));

  // La commande n'est plus dans la liste des commandes payées.
  const liste = texteBrut((await agent("GET", "/admin/commandes")).text);
  assert.ok(!liste.includes(commande.numero));
  assert.ok(liste.includes("Aucune commande payée pour le moment"));
});

test("US17 une commande déjà validée ne peut pas l'être deux fois", async () => {
  const { utilisateur } = await connecterBackOffice(baseUrl, "client");
  const { appeler: agent } = await connecterBackOffice(baseUrl, "admin");
  const commande = await creerCommande(utilisateur);

  assert.strictEqual((await agent("POST", validation(commande), {})).status, 302);
  const seconde = await agent("POST", validation(commande), {});
  assert.strictEqual(seconde.status, 409);
  assert.ok(texteBrut(seconde.text).includes("a déjà été validée"));

  // Une seule ligne « En préparation » dans l'historique.
  const enBase = await Commande.findById(commande._id);
  assert.strictEqual(enBase.historique.filter((h) => h.statut === "en_preparation").length, 1);
});

test("US17 seules les commandes payées peuvent être validées", async () => {
  const { utilisateur } = await connecterBackOffice(baseUrl, "client");
  const { appeler: agent } = await connecterBackOffice(baseUrl, "admin");

  for (const statut of ["en_attente_paiement", "annulee"]) {
    const commande = await creerCommande(utilisateur, { statut, historique: [{ statut }] });
    const reponse = await agent("POST", validation(commande), {});
    assert.strictEqual(reponse.status, 409, statut);
    assert.ok(texteBrut(reponse.text).includes("Seules les commandes payées peuvent être validées"), statut);
    assert.strictEqual((await Commande.findById(commande._id)).statut, statut);
  }
  for (const statut of ["prete", "en_livraison", "livree"]) {
    const commande = await creerCommande(utilisateur, { statut, historique: [{ statut }] });
    const reponse = await agent("POST", validation(commande), {});
    assert.strictEqual(reponse.status, 409, statut);
    assert.ok(texteBrut(reponse.text).includes("a déjà été validée"), statut);
    assert.strictEqual((await Commande.findById(commande._id)).statut, statut);
  }
});

test("US17 numéro inconnu : 404", async () => {
  const { appeler: agent } = await connecterBackOffice(baseUrl, "admin");
  const reponse = await agent("POST", "/admin/commandes/CMD-inconnue/validation", {});
  assert.strictEqual(reponse.status, 404);
});

test("US17 deux validations en même temps : une seule passe", async () => {
  const { utilisateur } = await connecterBackOffice(baseUrl, "client");
  const { appeler: agentA } = await connecterBackOffice(baseUrl, "admin", "agentA@mail.com");
  const { appeler: agentB } = await connecterBackOffice(baseUrl, "admin", "agentB@mail.com");
  const commande = await creerCommande(utilisateur);

  const [a, b] = await Promise.all([agentA("POST", validation(commande), {}), agentB("POST", validation(commande), {})]);
  assert.deepStrictEqual([a.status, b.status].sort(), [302, 409]);

  const enBase = await Commande.findById(commande._id);
  assert.strictEqual(enBase.statut, "en_preparation");
  assert.strictEqual(enBase.historique.filter((h) => h.statut === "en_preparation").length, 1);
});

// ---------- Côté client ----------

test("US17 le client voit le nouvel état de sa commande", async () => {
  const appelerClient = await connecter(baseUrl, "client");
  const client = await User.findOne({ email: "client@mail.com" });
  const { appeler: agent } = await connecterBackOffice(baseUrl, "admin");
  const commande = await creerCommande(client);

  const avant = await appelerClient("GET", `/api/commandes/${commande.numero}`);
  assert.strictEqual(avant.body.libelleStatut, "Payée");

  assert.strictEqual((await agent("POST", validation(commande), {})).status, 302);

  const apres = await appelerClient("GET", `/api/commandes/${commande.numero}`);
  assert.strictEqual(apres.status, 200);
  assert.strictEqual(apres.body.statut, "en_preparation");
  assert.strictEqual(apres.body.libelleStatut, "En préparation");
});
