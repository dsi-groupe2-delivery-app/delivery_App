// Tests US10 (consultation de la carte et des menus composés), sur une base MongoDB en mémoire.
const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const app = require("../src/app");
const Category = require("../src/models/Category");
const Product = require("../src/models/Product");
const MenuCompose = require("../src/models/MenuCompose");
const { navigateur } = require("./aide-api");

let mongod;
let server;
let visiteur; // aucune connexion : l'API de lecture est publique

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await Promise.all([Category.init(), Product.init(), MenuCompose.init()]);
  server = app.listen(0);
  visiteur = navigateur(`http://localhost:${server.address().port}`);
});

after(async () => {
  server.close();
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await Promise.all([Category.deleteMany({}), Product.deleteMany({}), MenuCompose.deleteMany({})]);
});

// Une carte de démonstration : Plats (ordre 2) et Desserts (ordre 1), plus une catégorie vide.
async function carte() {
  const plats = await Category.create({ nom: "Plats", ordre: 2 });
  const desserts = await Category.create({ nom: "Desserts", ordre: 1 });
  const vide = await Category.create({ nom: "Boissons", ordre: 3 });
  const pizza = await Product.create({ nom: "Pizza", prixMillimes: 12500, categorie: plats._id, image: "pizza.jpg" });
  const burger = await Product.create({ nom: "Burger", prixMillimes: 9000, categorie: plats._id, disponible: false });
  const tiramisu = await Product.create({ nom: "Tiramisu", prixMillimes: 6000, categorie: desserts._id });
  return { plats, desserts, vide, pizza, burger, tiramisu };
}

async function creerMenu(c, surcharge = {}) {
  return MenuCompose.create({
    nom: "Menu Duo",
    nomMinuscule: "menu duo",
    prixBase: 20,
    groupes: [
      {
        libelle: "Plat",
        min: 1,
        max: 1,
        ordre: 1,
        options: [
          { produit: c.pizza._id, supplement: 0 },
          { produit: c.burger._id, supplement: 2 },
        ],
      },
      { libelle: "Dessert", min: 0, max: 1, ordre: 0, options: [{ produit: c.tiramisu._id, supplement: 1.5 }] },
    ],
    ...surcharge,
  });
}

// ---------- Index (obligatoires pour les tris sur Cosmos DB) ----------

test("US10 index : le tri produits par catégorie et nom a son index", async () => {
  const cles = (await Product.collection.indexes()).map((i) => JSON.stringify(i.key));
  assert.ok(cles.includes(JSON.stringify({ categorie: 1, nom: 1 })));
});

// ---------- Catégories ----------

test("US10 catégories : triées par ordre, sans les catégories vides, sans connexion", async () => {
  await carte();
  const r = await visiteur("GET", "/api/categories");
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(r.body.map((c) => c.nom), ["Desserts", "Plats"]); // « Boissons » est vide
});

// ---------- Produits ----------

test("US10 produits : nom, prix en TND, image, disponibilité", async () => {
  await carte();
  const r = await visiteur("GET", "/api/produits");
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.length, 3);

  const pizza = r.body.find((p) => p.nom === "Pizza");
  assert.strictEqual(pizza.prix, 12.5);
  assert.strictEqual(pizza.image, "/uploads/pizza.jpg");
  assert.strictEqual(pizza.disponible, true);

  const burger = r.body.find((p) => p.nom === "Burger");
  assert.strictEqual(burger.disponible, false);
  assert.strictEqual(burger.image, "/static/produit-defaut.svg"); // image par défaut
});

test("US10 produits : filtre par catégorie", async () => {
  const c = await carte();
  const r = await visiteur("GET", `/api/produits?categorie=${c.desserts._id}`);
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(r.body.map((p) => p.nom), ["Tiramisu"]);
});

test("US10 produits : identifiant de catégorie invalide refusé", async () => {
  const r = await visiteur("GET", "/api/produits?categorie=abc");
  assert.strictEqual(r.status, 400);
});

// ---------- Menus composés ----------

test("US10 menus : liste avec « à partir de » (prix de base) et disponibilité", async () => {
  const c = await carte();
  await creerMenu(c);
  const r = await visiteur("GET", "/api/menus-composes");
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.length, 1);
  assert.strictEqual(r.body[0].nom, "Menu Duo");
  assert.strictEqual(r.body[0].prixBase, 20);
  assert.strictEqual(r.body[0].disponible, true);
  assert.strictEqual(r.body[0].image, "/static/produit-defaut.svg");
});

test("US10 menus : désactivé par l'agent = indisponible", async () => {
  const c = await carte();
  await creerMenu(c, { disponible: false });
  const r = await visiteur("GET", "/api/menus-composes");
  assert.strictEqual(r.body[0].disponible, false);
});

test("US10 menus : un groupe qui n'atteint plus son minimum rend le menu indisponible", async () => {
  const c = await carte();
  await creerMenu(c);
  await MenuCompose.updateOne({}, { $set: { "groupes.1.min": 1 } });
  await Product.updateOne({ _id: c.tiramisu._id }, { disponible: false });
  const r = await visiteur("GET", "/api/menus-composes");
  assert.strictEqual(r.body[0].disponible, false);
});

test("US10 détail d'un menu : groupes triés, règles min/max, suppléments, options indisponibles", async () => {
  const c = await carte();
  const menu = await creerMenu(c);
  const r = await visiteur("GET", `/api/menus-composes/${menu._id}`);
  assert.strictEqual(r.status, 200);

  assert.deepStrictEqual(r.body.groupes.map((g) => g.libelle), ["Dessert", "Plat"]); // tri par ordre
  const plat = r.body.groupes.find((g) => g.libelle === "Plat");
  assert.strictEqual(plat.min, 1);
  assert.strictEqual(plat.max, 1);
  const burger = plat.options.find((o) => o.produit.nom === "Burger");
  assert.strictEqual(burger.supplement, 2);
  assert.strictEqual(burger.produit.disponible, false);
});

test("US10 détail d'un menu : inexistant ou identifiant invalide = 404", async () => {
  const r1 = await visiteur("GET", `/api/menus-composes/${new mongoose.Types.ObjectId()}`);
  assert.strictEqual(r1.status, 404);
  const r2 = await visiteur("GET", "/api/menus-composes/abc");
  assert.strictEqual(r2.status, 404);
});
