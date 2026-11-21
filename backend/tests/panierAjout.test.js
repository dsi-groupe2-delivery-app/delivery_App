// Tests US11 (ajout au panier), sur une base MongoDB en mémoire.
const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const app = require("../src/app");
const User = require("../src/models/User");
const Category = require("../src/models/Category");
const Product = require("../src/models/Product");
const MenuCompose = require("../src/models/MenuCompose");
const Cart = require("../src/models/Cart");
const { navigateur, connecter } = require("./aide-api");

let mongod;
let server;
let baseUrl;

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await Promise.all([User.init(), Category.init(), Product.init(), MenuCompose.init(), Cart.init()]);
  server = app.listen(0);
  baseUrl = `http://localhost:${server.address().port}`;
});

after(async () => {
  server.close();
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Product.deleteMany({}),
    MenuCompose.deleteMany({}),
    Cart.deleteMany({}),
  ]);
});

// Pizza 12,500 ; Burger 9,000 (indisponible) ; Tiramisu 6,000.
// Menu Duo : 20 TND ; groupe Plat (1 obligatoire) avec Burger +2 ; groupe Dessert (0 à 1) avec Tiramisu +1,5.
async function donnees() {
  const cat = await Category.create({ nom: "Plats" });
  const pizza = await Product.create({ nom: "Pizza", prixMillimes: 12500, categorie: cat._id });
  const burger = await Product.create({ nom: "Burger", prixMillimes: 9000, categorie: cat._id, disponible: false });
  const tiramisu = await Product.create({ nom: "Tiramisu", prixMillimes: 6000, categorie: cat._id });
  const pates = await Product.create({ nom: "Pâtes", prixMillimes: 8000, categorie: cat._id });
  const menu = await MenuCompose.create({
    nom: "Menu Duo",
    nomMinuscule: "menu duo",
    prixBase: 20,
    groupes: [
      {
        libelle: "Plat",
        min: 1,
        max: 1,
        ordre: 0,
        options: [
          { produit: pizza._id, supplement: 0 },
          { produit: pates._id, supplement: 2 },
          { produit: burger._id, supplement: 3 },
        ],
      },
      { libelle: "Dessert", min: 0, max: 1, ordre: 1, options: [{ produit: tiramisu._id, supplement: 1.5 }] },
    ],
  });
  const [gPlat, gDessert] = menu.groupes;
  return { pizza, burger, tiramisu, pates, menu, gPlat, gDessert };
}

const choix = (d, plat, desserts = []) => ({
  [d.gPlat._id]: [String(plat._id)],
  [d.gDessert._id]: desserts.map((p) => String(p._id)),
});

// ---------- Contrôle d'accès ----------

test("US11 accès : visiteur 401, livreur et agent 403, client autorisé", async () => {
  assert.strictEqual((await navigateur(baseUrl)("GET", "/api/panier")).status, 401);
  const d = await donnees();
  const corps = { type: "produit", produitId: String(d.pizza._id) };
  assert.strictEqual((await navigateur(baseUrl)("POST", "/api/panier/lignes", corps)).status, 401);

  const livreur = await connecter(baseUrl, "livreur");
  assert.strictEqual((await livreur("GET", "/api/panier")).status, 403);
  assert.strictEqual((await livreur("POST", "/api/panier/lignes", corps)).status, 403);

  const agent = await connecter(baseUrl, "admin");
  assert.strictEqual((await agent("GET", "/api/panier")).status, 403);

  const client = await connecter(baseUrl, "client");
  const r = await client("GET", "/api/panier");
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(r.body, { lignes: [], nombreArticles: 0, total: 0 });
});

// ---------- US11 : ajout d'un produit ----------

test("US11 produit : ajout simple, quantité 1 par défaut, total en TND", async () => {
  const d = await donnees();
  const client = await connecter(baseUrl, "client");
  const r = await client("POST", "/api/panier/lignes", { type: "produit", produitId: String(d.pizza._id) });
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.body.lignes.length, 1);
  assert.strictEqual(r.body.lignes[0].quantite, 1);
  assert.strictEqual(r.body.lignes[0].prixUnitaire, 12.5);
  assert.strictEqual(r.body.total, 12.5);
  assert.strictEqual(r.body.nombreArticles, 1);
});

test("US11 produit : le même produit augmente la quantité de la ligne existante", async () => {
  const d = await donnees();
  const client = await connecter(baseUrl, "client");
  const corps = { type: "produit", produitId: String(d.pizza._id), quantite: 2 };
  await client("POST", "/api/panier/lignes", corps);
  const r = await client("POST", "/api/panier/lignes", { ...corps, quantite: 3 });
  assert.strictEqual(r.body.lignes.length, 1);
  assert.strictEqual(r.body.lignes[0].quantite, 5);
  assert.strictEqual(r.body.total, 62.5);
});

test("US11 produit : le cumul ne peut pas dépasser 20", async () => {
  const d = await donnees();
  const client = await connecter(baseUrl, "client");
  const corps = { type: "produit", produitId: String(d.pizza._id), quantite: 15 };
  await client("POST", "/api/panier/lignes", corps);
  const r = await client("POST", "/api/panier/lignes", corps);
  assert.strictEqual(r.status, 400);
  assert.match(r.body.message, /Quantité maximale/);
});

test("US11 produit : quantité invalide refusée (0, 21, décimale, texte)", async () => {
  const d = await donnees();
  const client = await connecter(baseUrl, "client");
  for (const quantite of [0, 21, -1, 1.5, "abc"]) {
    const r = await client("POST", "/api/panier/lignes", { type: "produit", produitId: String(d.pizza._id), quantite });
    assert.strictEqual(r.status, 400, `quantité ${quantite}`);
  }
  assert.strictEqual(await Cart.countDocuments({ "lignes.0": { $exists: true } }), 0);
});

test("US11 produit : indisponible ou inexistant refusé avec un message clair", async () => {
  const d = await donnees();
  const client = await connecter(baseUrl, "client");
  const indispo = await client("POST", "/api/panier/lignes", { type: "produit", produitId: String(d.burger._id) });
  assert.strictEqual(indispo.status, 409);
  assert.match(indispo.body.message, /Burger.*indisponible/);

  const inconnu = await client("POST", "/api/panier/lignes", {
    type: "produit",
    produitId: String(new mongoose.Types.ObjectId()),
  });
  assert.strictEqual(inconnu.status, 404);

  const invalide = await client("POST", "/api/panier/lignes", { type: "produit", produitId: "abc" });
  assert.strictEqual(invalide.status, 400);
});

test("US11 le prix envoyé par le navigateur est ignoré : le serveur calcule", async () => {
  const d = await donnees();
  const client = await connecter(baseUrl, "client");
  const r = await client("POST", "/api/panier/lignes", {
    type: "produit",
    produitId: String(d.pizza._id),
    prix: 0.001,
    prixUnitaire: 0.001,
    total: 0,
  });
  assert.strictEqual(r.body.total, 12.5);
});

// ---------- US11 : ajout d'un menu composé ----------

test("US11 menu : prix = prix de base + suppléments des options choisies", async () => {
  const d = await donnees();
  const client = await connecter(baseUrl, "client");
  const r = await client("POST", "/api/panier/lignes", {
    type: "menu",
    menuId: String(d.menu._id),
    choix: choix(d, d.pates, [d.tiramisu]),
  });
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.body.lignes[0].prixUnitaire, 23.5); // 20 + 2 + 1,5
  assert.strictEqual(r.body.lignes[0].nom, "Menu Duo");
  assert.deepStrictEqual(r.body.lignes[0].choix.map((g) => g.libelle), ["Plat", "Dessert"]);
});

test("US11 menu : minimum non atteint refusé, le message nomme le groupe", async () => {
  const d = await donnees();
  const client = await connecter(baseUrl, "client");
  const r = await client("POST", "/api/panier/lignes", { type: "menu", menuId: String(d.menu._id), choix: {} });
  assert.strictEqual(r.status, 400);
  assert.match(r.body.message, /Plat/);
});

test("US11 menu : maximum dépassé refusé", async () => {
  const d = await donnees();
  const client = await connecter(baseUrl, "client");
  const r = await client("POST", "/api/panier/lignes", {
    type: "menu",
    menuId: String(d.menu._id),
    choix: { [d.gPlat._id]: [String(d.pizza._id), String(d.pates._id)] },
  });
  assert.strictEqual(r.status, 400);
  assert.match(r.body.message, /Plat/);
});

test("US11 menu : choix mal formé refusé", async () => {
  const d = await donnees();
  const client = await connecter(baseUrl, "client");
  for (const mauvais of ["texte", [1], { abc: ["x"] }, { [d.gPlat._id]: "pizza" }]) {
    const r = await client("POST", "/api/panier/lignes", { type: "menu", menuId: String(d.menu._id), choix: mauvais });
    assert.strictEqual(r.status, 400);
  }
});

test("US11 menu : option indisponible ou menu indisponible refusés", async () => {
  const d = await donnees();
  const client = await connecter(baseUrl, "client");
  const option = await client("POST", "/api/panier/lignes", {
    type: "menu",
    menuId: String(d.menu._id),
    choix: choix(d, d.burger),
  });
  assert.strictEqual(option.status, 409);
  assert.match(option.body.message, /Burger/);

  await MenuCompose.updateOne({ _id: d.menu._id }, { disponible: false });
  const menu = await client("POST", "/api/panier/lignes", {
    type: "menu",
    menuId: String(d.menu._id),
    choix: choix(d, d.pizza),
  });
  assert.strictEqual(menu.status, 409);
});

test("US11 menu : mêmes choix = même ligne ; choix différents = autre ligne", async () => {
  const d = await donnees();
  const client = await connecter(baseUrl, "client");
  const corps = (plat) => ({ type: "menu", menuId: String(d.menu._id), choix: choix(d, plat) });
  await client("POST", "/api/panier/lignes", corps(d.pizza));
  await client("POST", "/api/panier/lignes", corps(d.pizza));
  const r = await client("POST", "/api/panier/lignes", corps(d.pates));
  assert.strictEqual(r.body.lignes.length, 2);
  assert.strictEqual(r.body.lignes[0].quantite, 2);
  assert.strictEqual(r.body.nombreArticles, 3);
});

// ---------- Panier rattaché au compte ----------

test("US11 le panier est retrouvé après déconnexion puis reconnexion", async () => {
  const d = await donnees();
  const client = await connecter(baseUrl, "client", "amira@mail.com");
  await client("POST", "/api/panier/lignes", { type: "produit", produitId: String(d.pizza._id), quantite: 2 });
  await client("POST", "/api/auth/logout");
  assert.strictEqual((await client("GET", "/api/panier")).status, 401);

  const retour = navigateur(baseUrl);
  await retour("POST", "/api/auth/login", { email: "amira@mail.com", password: "secret123" });
  const r = await retour("GET", "/api/panier");
  assert.strictEqual(r.body.lignes[0].quantite, 2);
});

test("US11 un client ne voit pas le panier d'un autre", async () => {
  const d = await donnees();
  const amira = await connecter(baseUrl, "client", "amira@mail.com");
  const sami = await connecter(baseUrl, "client", "sami@mail.com");
  await amira("POST", "/api/panier/lignes", { type: "produit", produitId: String(d.pizza._id) });

  assert.strictEqual((await sami("GET", "/api/panier")).body.lignes.length, 0);
  assert.strictEqual((await amira("GET", "/api/panier")).body.lignes[0].quantite, 1);
});
