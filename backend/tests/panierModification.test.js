// Tests US12 (modification du panier), sur une base MongoDB en mémoire.
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

test("US12 un client ne peut ni modifier ni supprimer la ligne d'un autre", async () => {
  const d = await donnees();
  const amira = await connecter(baseUrl, "client", "amira@mail.com");
  const sami = await connecter(baseUrl, "client", "sami@mail.com");
  const ajout = await amira("POST", "/api/panier/lignes", { type: "produit", produitId: String(d.pizza._id) });
  const ligneId = ajout.body.lignes[0]._id;

  assert.strictEqual((await sami("GET", "/api/panier")).body.lignes.length, 0);
  assert.strictEqual((await sami("PATCH", `/api/panier/lignes/${ligneId}`, { quantite: 9 })).status, 404);
  assert.strictEqual((await sami("DELETE", `/api/panier/lignes/${ligneId}`)).status, 404);

  assert.strictEqual((await amira("GET", "/api/panier")).body.lignes[0].quantite, 1); // intact
});

// ---------- US12 : modifier le panier ----------

test("US12 quantité : modification et total recalculé par le serveur", async () => {
  const d = await donnees();
  const client = await connecter(baseUrl, "client");
  const ajout = await client("POST", "/api/panier/lignes", { type: "produit", produitId: String(d.pizza._id) });
  const r = await client("PATCH", `/api/panier/lignes/${ajout.body.lignes[0]._id}`, { quantite: 4 });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.lignes[0].quantite, 4);
  assert.strictEqual(r.body.lignes[0].totalLigne, 50);
  assert.strictEqual(r.body.total, 50);
});

test("US12 quantité : 0 supprime la ligne ; négative, décimale ou > 20 refusées", async () => {
  const d = await donnees();
  const client = await connecter(baseUrl, "client");
  const ajout = await client("POST", "/api/panier/lignes", { type: "produit", produitId: String(d.pizza._id) });
  const url = `/api/panier/lignes/${ajout.body.lignes[0]._id}`;

  for (const quantite of [-1, 1.5, 21, "abc"]) {
    assert.strictEqual((await client("PATCH", url, { quantite })).status, 400, `quantité ${quantite}`);
  }
  assert.strictEqual((await client("PATCH", url, {})).status, 400); // rien à modifier

  const r = await client("PATCH", url, { quantite: 0 });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.lignes.length, 0);
});

test("US12 suppression d'une ligne, puis vider le panier", async () => {
  const d = await donnees();
  const client = await connecter(baseUrl, "client");
  await client("POST", "/api/panier/lignes", { type: "produit", produitId: String(d.pizza._id) });
  const deux = await client("POST", "/api/panier/lignes", { type: "produit", produitId: String(d.tiramisu._id) });
  assert.strictEqual(deux.body.lignes.length, 2);

  const sans = await client("DELETE", `/api/panier/lignes/${deux.body.lignes[1]._id}`);
  assert.strictEqual(sans.body.lignes.length, 1);
  assert.strictEqual((await client("DELETE", `/api/panier/lignes/${deux.body.lignes[1]._id}`)).status, 404);
  assert.strictEqual((await client("DELETE", "/api/panier/lignes/abc")).status, 404);

  const vide = await client("DELETE", "/api/panier");
  assert.deepStrictEqual(vide.body, { lignes: [], nombreArticles: 0, total: 0 });
});

test("US12 menu : modification des choix avec les mêmes règles min/max", async () => {
  const d = await donnees();
  const client = await connecter(baseUrl, "client");
  const ajout = await client("POST", "/api/panier/lignes", {
    type: "menu",
    menuId: String(d.menu._id),
    choix: choix(d, d.pizza),
  });
  const url = `/api/panier/lignes/${ajout.body.lignes[0]._id}`;
  assert.strictEqual(ajout.body.lignes[0].prixUnitaire, 20);

  const bon = await client("PATCH", url, { choix: choix(d, d.pates, [d.tiramisu]) });
  assert.strictEqual(bon.status, 200);
  assert.strictEqual(bon.body.lignes[0].prixUnitaire, 23.5);

  const incomplet = await client("PATCH", url, { choix: {} });
  assert.strictEqual(incomplet.status, 400);
  assert.match(incomplet.body.message, /Plat/);

  const indispo = await client("PATCH", url, { choix: choix(d, d.burger) });
  assert.strictEqual(indispo.status, 409);

  // Les choix valides précédents sont conservés après un refus.
  assert.strictEqual((await client("GET", "/api/panier")).body.lignes[0].prixUnitaire, 23.5);
});

test("US12 choix : refusés sur une ligne qui est un simple produit", async () => {
  const d = await donnees();
  const client = await connecter(baseUrl, "client");
  const ajout = await client("POST", "/api/panier/lignes", { type: "produit", produitId: String(d.pizza._id) });
  const r = await client("PATCH", `/api/panier/lignes/${ajout.body.lignes[0]._id}`, { choix: {} });
  assert.strictEqual(r.status, 400);
});

test("US12 produit devenu indisponible : signalé sur la ligne et exclu du total", async () => {
  const d = await donnees();
  const client = await connecter(baseUrl, "client");
  await client("POST", "/api/panier/lignes", { type: "produit", produitId: String(d.pizza._id) });
  await client("POST", "/api/panier/lignes", { type: "produit", produitId: String(d.tiramisu._id) });

  await Product.updateOne({ _id: d.pizza._id }, { disponible: false });
  const r = await client("GET", "/api/panier");
  const pizza = r.body.lignes.find((l) => l.nom === "Pizza");
  assert.strictEqual(pizza.disponible, false);
  assert.strictEqual(pizza.alertes[0].type, "indisponible");
  assert.strictEqual(r.body.total, 6); // seul le tiramisu est commandable
});

test("US12 prix modifié par l'agent : signalé, puis effacé quand le client modifie la ligne", async () => {
  const d = await donnees();
  const client = await connecter(baseUrl, "client");
  const ajout = await client("POST", "/api/panier/lignes", { type: "produit", produitId: String(d.pizza._id) });

  await Product.updateOne({ _id: d.pizza._id }, { prixMillimes: 14000 });
  const r = await client("GET", "/api/panier");
  assert.strictEqual(r.body.lignes[0].prixUnitaire, 14); // nouveau prix
  assert.strictEqual(r.body.lignes[0].alertes[0].type, "prix_modifie");
  assert.match(r.body.lignes[0].alertes[0].message, /12\.500 → 14\.000/);

  const apres = await client("PATCH", `/api/panier/lignes/${ajout.body.lignes[0]._id}`, { quantite: 2 });
  assert.strictEqual(apres.body.lignes[0].alertes.length, 0);
  assert.strictEqual(apres.body.total, 28);
});

test("US12 menu modifié par l'agent : option devenue indisponible signalée", async () => {
  const d = await donnees();
  const client = await connecter(baseUrl, "client");
  await client("POST", "/api/panier/lignes", { type: "menu", menuId: String(d.menu._id), choix: choix(d, d.pizza) });
  await Product.updateOne({ _id: d.pizza._id }, { disponible: false });
  const r = await client("GET", "/api/panier");
  assert.strictEqual(r.body.lignes[0].disponible, false);
  assert.match(r.body.lignes[0].alertes[0].message, /Pizza/);
  assert.strictEqual(r.body.total, 0);
});
test("US12 ligne indisponible : quantité non modifiable, suppression possible", async () => {
  const d = await donnees();
  const client = await connecter(baseUrl, "client");
  const ajout = await client("POST", "/api/panier/lignes", { type: "produit", produitId: String(d.pizza._id) });
  const url = `/api/panier/lignes/${ajout.body.lignes[0]._id}`;

  await Product.updateOne({ _id: d.pizza._id }, { disponible: false });
  assert.strictEqual((await client("PATCH", url, { quantite: 3 })).status, 409);
  assert.strictEqual((await client("PATCH", url, { quantite: 0 })).status, 200);
});
