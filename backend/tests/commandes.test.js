// Tests US14 (valider le panier), sur une base MongoDB en mémoire.
const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const app = require("../src/app");
const User = require("../src/models/User");
const Category = require("../src/models/Category");
const Product = require("../src/models/Product");
const Cart = require("../src/models/Cart");
const Adresse = require("../src/models/Adresse");
const Commande = require("../src/models/Commande");
const Compteur = require("../src/models/Compteur");
const { navigateur, connecter } = require("./aide-api");

let mongod;
let server;
let baseUrl;

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await Promise.all([User.init(), Category.init(), Product.init(), Cart.init(), Adresse.init(), Commande.init()]);
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
  await Promise.all(
    [User, Category, Product, Cart, Adresse, Commande, Compteur].map((M) => M.deleteMany({}))
  );
});

const ADRESSE = {
  libelle: "Maison",
  rue: "5 avenue Habib Bourguiba",
  ville: "Tunis",
  codePostal: "1000",
  telephone: "22000000",
  instructions: "Sonner 2 fois",
  enregistrer: true,
};

let n = 0;
const cle = () => `cle-test-${++n}-${Date.now()}`;

// Client connecté avec 2 pizzas (12,500) + 1 tiramisu (6,000) = 31,000 TND, et une adresse choisie.
async function clientAvecPanier({ avecAdresse = true, email } = {}) {
  const cat = await Category.create({ nom: `Plats ${++n}` });
  const pizza = await Product.create({ nom: "Pizza", prixMillimes: 12500, categorie: cat._id });
  const tiramisu = await Product.create({ nom: "Tiramisu", prixMillimes: 6000, categorie: cat._id });
  const appeler = await connecter(baseUrl, "client", email);
  await appeler("POST", "/api/panier/lignes", { type: "produit", produitId: String(pizza._id), quantite: 2 });
  await appeler("POST", "/api/panier/lignes", { type: "produit", produitId: String(tiramisu._id) });
  if (avecAdresse) {
    const adresse = await appeler("POST", "/api/adresses", ADRESSE);
    await appeler("PUT", "/api/panier/adresse", { adresseId: adresse.body._id });
  }
  return { appeler, pizza, tiramisu };
}

// ---------- US14 : valider le panier ----------

test("US14 accès : visiteur 401, livreur et agent 403", async () => {
  assert.strictEqual((await navigateur(baseUrl)("POST", "/api/commandes", { cle: cle() })).status, 401);
  const livreur = await connecter(baseUrl, "livreur");
  const agent = await connecter(baseUrl, "admin");
  assert.strictEqual((await livreur("POST", "/api/commandes", { cle: cle() })).status, 403);
  assert.strictEqual((await agent("POST", "/api/commandes", { cle: cle() })).status, 403);
});

test("US14 validation : commande créée, numéro unique, total serveur, prix figés, panier vidé", async () => {
  const { appeler, pizza } = await clientAvecPanier();
  const res = await appeler("POST", "/api/commandes", { cle: cle(), total: 1 }); // total du navigateur ignoré
  assert.strictEqual(res.status, 201);
  assert.match(res.body.numero, /^CMD-\d{8}-0001$/);
  assert.strictEqual(res.body.statut, "en_attente_paiement");
  assert.strictEqual(res.body.libelleStatut, "En attente de paiement");
  assert.strictEqual(res.body.total, 31);
  assert.strictEqual(res.body.nombreArticles, 3);
  assert.deepStrictEqual(
    res.body.lignes.map((l) => [l.nom, l.quantite, l.prixUnitaire, l.totalLigne]),
    [["Pizza", 2, 12.5, 25], ["Tiramisu", 1, 6, 6]]
  );
  assert.strictEqual(res.body.adresse.rue, ADRESSE.rue);

  // Panier vidé (articles et adresse).
  const panier = await appeler("GET", "/api/panier");
  assert.strictEqual(panier.body.lignes.length, 0);
  assert.ok(!panier.body.adresse);

  // Prix figés : l'agent change le prix ensuite, la commande ne bouge pas.
  await Product.updateOne({ _id: pizza._id }, { prixMillimes: 99000 });
  const lue = await appeler("GET", `/api/commandes/${res.body.numero}`);
  assert.strictEqual(lue.body.total, 31);
});

test("US14 numéros : deux commandes du jour ont des numéros différents", async () => {
  const a = await clientAvecPanier({ email: "a@mail.com" });
  const b = await clientAvecPanier({ email: "b@mail.com" });
  const c1 = await a.appeler("POST", "/api/commandes", { cle: cle() });
  const c2 = await b.appeler("POST", "/api/commandes", { cle: cle() });
  assert.notStrictEqual(c1.body.numero, c2.body.numero);
  assert.match(c2.body.numero, /-0002$/);
});

test("US14 double clic : la même clé ne crée qu'une seule commande", async () => {
  const { appeler } = await clientAvecPanier();
  const k = cle();
  const [r1, r2] = await Promise.all([
    appeler("POST", "/api/commandes", { cle: k }),
    appeler("POST", "/api/commandes", { cle: k }),
  ]);
  assert.deepStrictEqual([r1.status, r2.status].sort(), [200, 201]);
  assert.strictEqual(r1.body.numero, r2.body.numero);
  assert.strictEqual(await Commande.countDocuments(), 1);
});

test("US14 panier vide : refusé, rien n'est créé", async () => {
  const appeler = await connecter(baseUrl, "client");
  const res = await appeler("POST", "/api/commandes", { cle: cle() });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.message, "Votre panier est vide");
  assert.strictEqual(await Commande.countDocuments(), 0);
});

test("US14 sans adresse de livraison : refusé", async () => {
  const { appeler } = await clientAvecPanier({ avecAdresse: false });
  const res = await appeler("POST", "/api/commandes", { cle: cle() });
  assert.strictEqual(res.status, 400);
  assert.match(res.body.message, /adresse de livraison/);
  assert.strictEqual(await Commande.countDocuments(), 0);
});

test("US14 produit devenu indisponible : message explicatif, validation refusée, panier gardé", async () => {
  const { appeler, tiramisu } = await clientAvecPanier();
  await Product.updateOne({ _id: tiramisu._id }, { disponible: false });
  const res = await appeler("POST", "/api/commandes", { cle: cle() });
  assert.strictEqual(res.status, 409);
  assert.ok(res.body.details.some((d) => d.includes("Tiramisu") && d.includes("indisponible")));
  assert.strictEqual(await Commande.countDocuments(), 0);
  assert.strictEqual((await appeler("GET", "/api/panier")).body.lignes.length, 2);
});

test("US14 prix modifié depuis l'ajout : retour au panier demandé", async () => {
  const { appeler, pizza } = await clientAvecPanier();
  await Product.updateOne({ _id: pizza._id }, { prixMillimes: 14000 });
  const res = await appeler("POST", "/api/commandes", { cle: cle() });
  assert.strictEqual(res.status, 409);
  assert.ok(res.body.details.some((d) => d.includes("prix")));
});

test("US14 clé de validation manquante : 400", async () => {
  const { appeler } = await clientAvecPanier();
  assert.strictEqual((await appeler("POST", "/api/commandes", {})).status, 400);
});

test("US14 un client ne voit pas la commande d'un autre (404)", async () => {
  const a = await clientAvecPanier({ email: "a@mail.com" });
  const commande = await a.appeler("POST", "/api/commandes", { cle: cle() });
  const autre = await connecter(baseUrl, "client", "b@mail.com");
  assert.strictEqual((await autre("GET", `/api/commandes/${commande.body.numero}`)).status, 404);
});
