// Tests US16 (l'agent consulte les commandes payées), sur une base MongoDB en mémoire.
const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const app = require("../src/app");
const User = require("../src/models/User");
const Commande = require("../src/models/Commande");
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

// ---------- Index (obligatoire pour le tri sur Cosmos DB) ----------

test("US16 index : le tri des commandes par date a son index", async () => {
  const cles = (await Commande.collection.indexes()).map((i) => JSON.stringify(i.key));
  assert.ok(cles.includes(JSON.stringify({ createdAt: -1 })));
});

// ---------- Accès ----------

test("US16 accès : visiteur redirigé, client et livreur refusés (403), agent autorisé", async () => {
  const { appeler: client, utilisateur } = await connecterBackOffice(baseUrl, "client");
  const { appeler: livreur } = await connecterBackOffice(baseUrl, "livreur");
  const { appeler: agent } = await connecterBackOffice(baseUrl, "admin");
  const commande = await creerCommande(utilisateur);
  const chemins = ["/admin/commandes", `/admin/commandes/${commande.numero}`];

  for (const chemin of chemins) {
    const visiteur = await navigateurHtml(baseUrl)("GET", chemin);
    assert.strictEqual(visiteur.status, 302);
    assert.strictEqual(visiteur.location, "/admin/connexion");
    assert.strictEqual((await client("GET", chemin)).status, 403);
    assert.strictEqual((await livreur("GET", chemin)).status, 403);
    assert.strictEqual((await agent("GET", chemin)).status, 200);
  }
});

// ---------- Liste ----------

test("US16 liste : seulement les commandes payées, avec numéro, date, client, adresse et total", async () => {
  const { utilisateur } = await connecterBackOffice(baseUrl, "client");
  const { appeler: agent } = await connecterBackOffice(baseUrl, "admin");
  const payee = await creerCommande(utilisateur);
  const autres = [];
  for (const statut of ["en_attente_paiement", "en_preparation", "prete", "en_livraison", "livree", "annulee"]) {
    autres.push(await creerCommande(utilisateur, { statut }));
  }

  const page = await agent("GET", "/admin/commandes");
  const texte = texteBrut(page.text);
  assert.strictEqual(page.status, 200);
  assert.ok(texte.includes(payee.numero));
  for (const autre of autres) assert.ok(!texte.includes(autre.numero), `${autre.statut} ne doit pas apparaître`);
  assert.ok(texte.includes("Sami Trabelsi"));
  assert.ok(texte.includes("31.000 TND"));
  assert.ok(texte.includes("5 avenue Habib Bourguiba, 1000 Tunis"));
  assert.match(texte, /\d{2}\/\d{2}\/\d{4}/); // la date
  assert.ok(texte.includes(`/admin/commandes/${payee.numero}`)); // lien vers le détail
});

test("US16 tri par date : récentes d'abord par défaut, anciennes d'abord sur demande", async () => {
  const { utilisateur } = await connecterBackOffice(baseUrl, "client");
  const { appeler: agent } = await connecterBackOffice(baseUrl, "admin");
  const ancienne = await creerCommande(utilisateur, { creeeLe: new Date("2026-11-20T10:00:00Z") });
  const recente = await creerCommande(utilisateur, { creeeLe: new Date("2026-11-25T10:00:00Z") });

  const position = (texte, commande) => texte.indexOf(commande.numero);

  const parDefaut = (await agent("GET", "/admin/commandes")).text;
  assert.ok(position(parDefaut, recente) < position(parDefaut, ancienne));

  const anciennes = (await agent("GET", "/admin/commandes?tri=ancien")).text;
  assert.ok(position(anciennes, ancienne) < position(anciennes, recente));

  const recentes = (await agent("GET", "/admin/commandes?tri=recent")).text;
  assert.ok(position(recentes, recente) < position(recentes, ancienne));

  // Un tri inconnu ne casse pas la page : tri par défaut.
  const inconnu = await agent("GET", "/admin/commandes?tri=n-importe-quoi");
  assert.strictEqual(inconnu.status, 200);
  assert.ok(position(inconnu.text, recente) < position(inconnu.text, ancienne));
});

test("US16 liste vide : un message informatif est affiché", async () => {
  const { utilisateur } = await connecterBackOffice(baseUrl, "client");
  const { appeler: agent } = await connecterBackOffice(baseUrl, "admin");
  await creerCommande(utilisateur, { statut: "en_attente_paiement" }); // pas payée : n'apparaît pas

  const page = await agent("GET", "/admin/commandes");
  assert.strictEqual(page.status, 200);
  assert.ok(texteBrut(page.text).includes("Aucune commande payée pour le moment"));
});

// ---------- Détail ----------

test("US16 détail : produits, quantités, choix du menu, prix, client et adresse", async () => {
  const { utilisateur } = await connecterBackOffice(baseUrl, "client");
  const { appeler: agent } = await connecterBackOffice(baseUrl, "admin");
  const commande = await creerCommande(utilisateur);

  const page = await agent("GET", `/admin/commandes/${commande.numero}`);
  const texte = texteBrut(page.text);
  assert.strictEqual(page.status, 200);
  assert.ok(texte.includes(commande.numero));
  assert.ok(texte.includes("Payée"));
  // Lignes : nom, quantité, prix unitaire, total de la ligne
  assert.ok(texte.includes("Pizza"));
  assert.ok(texte.includes("12.500 TND"));
  assert.ok(texte.includes("25.000 TND"));
  assert.ok(texte.includes("Menu Etudiant"));
  assert.ok(texte.includes("6.000 TND"));
  assert.ok(texte.includes("Boisson : Jus d'orange")); // choix du menu composé
  assert.ok(texte.includes("31.000 TND")); // total
  // Client et adresse
  assert.ok(texte.includes("Sami Trabelsi"));
  assert.ok(texte.includes("client@mail.com"));
  assert.ok(texte.includes("5 avenue Habib Bourguiba, 1000 Tunis"));
});

test("US16 détail : numéro inconnu = page 404", async () => {
  const { appeler: agent } = await connecterBackOffice(baseUrl, "admin");
  const page = await agent("GET", "/admin/commandes/CMD-inconnue");
  assert.strictEqual(page.status, 404);
  assert.ok(texteBrut(page.text).includes("Commande introuvable"));
});

test("US16 détail : un client supprimé n'empêche pas d'afficher la commande", async () => {
  const { utilisateur } = await connecterBackOffice(baseUrl, "client");
  const { appeler: agent } = await connecterBackOffice(baseUrl, "admin");
  const commande = await creerCommande(utilisateur);
  await User.deleteOne({ _id: utilisateur._id });

  const page = await agent("GET", `/admin/commandes/${commande.numero}`);
  assert.strictEqual(page.status, 200);
  assert.ok(page.text.includes("Client supprimé"));
});
