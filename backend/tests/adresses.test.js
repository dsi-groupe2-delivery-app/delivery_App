// Tests US13 (adresse de livraison), sur une base MongoDB en mémoire.
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
const { navigateur, connecter } = require("./aide-api");

let mongod;
let server;
let baseUrl;

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await Promise.all([User.init(), Category.init(), Product.init(), Cart.init(), Adresse.init()]);
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
    Cart.deleteMany({}),
    Adresse.deleteMany({}),
  ]);
});

// Adresse valide, comme le formulaire Angular l'envoie ; on remplace seulement les champs utiles au test.
function adresseValide(autres = {}) {
  return Object.assign(
    {
      libelle: "Maison",
      rue: "5 avenue Habib Bourguiba",
      complement: "",
      ville: "Tunis",
      codePostal: "1000",
      telephone: "22 000 000",
      instructions: "Sonner 2 fois",
      enregistrer: true,
    },
    autres
  );
}

// Ajoute une pizza au panier du client (le choix d'une adresse exige un panier non vide).
async function remplirPanier(client) {
  const categorie = await Category.create({ nom: "Plats" });
  const pizza = await Product.create({ nom: "Pizza", prixMillimes: 12500, categorie: categorie._id });
  const reponse = await client("POST", "/api/panier/lignes", { type: "produit", produitId: String(pizza._id) });
  assert.strictEqual(reponse.status, 201);
}

test("US13 index : la recherche des adresses d'un client a son index (Cosmos DB)", async () => {
  const cles = (await Adresse.collection.indexes()).map((i) => JSON.stringify(i.key));
  assert.ok(cles.includes(JSON.stringify({ client: 1 })));
});

test("US13 accès : visiteur 401, livreur et agent 403", async () => {
  const visiteur = navigateur(baseUrl);
  assert.strictEqual((await visiteur("GET", "/api/adresses")).status, 401);
  assert.strictEqual((await visiteur("PUT", "/api/panier/adresse", { adresseId: "abc" })).status, 401);

  for (const role of ["livreur", "admin"]) {
    const appeler = await connecter(baseUrl, role);
    assert.strictEqual((await appeler("GET", "/api/adresses")).status, 403);
    assert.strictEqual((await appeler("POST", "/api/adresses", adresseValide())).status, 403);
  }
});

test("US13 adresse valide : enregistrée dans le profil, téléphone sans espaces, client piégé ignoré", async () => {
  const client = await connecter(baseUrl, "client");
  const piege = new mongoose.Types.ObjectId();

  const reponse = await client("POST", "/api/adresses", adresseValide({ client: String(piege) }));
  assert.strictEqual(reponse.status, 201);
  assert.strictEqual(reponse.body.telephone, "22000000");
  assert.strictEqual(reponse.body.enregistree, true);
  assert.strictEqual(reponse.body.client, undefined); // jamais renvoyé au navigateur

  // Le propriétaire est le client connecté, pas celui envoyé dans le corps.
  const moi = await User.findOne({ email: "client@mail.com" });
  const enBase = await Adresse.findById(reponse.body._id);
  assert.ok(enBase.client.equals(moi._id));

  const liste = await client("GET", "/api/adresses");
  assert.strictEqual(liste.status, 200);
  assert.strictEqual(liste.body.length, 1);
  assert.strictEqual(liste.body[0].rue, "5 avenue Habib Bourguiba");
});

test("US13 adresse non enregistrée : créée pour le panier, absente de « Mes adresses »", async () => {
  const client = await connecter(baseUrl, "client");

  const reponse = await client("POST", "/api/adresses", adresseValide({ enregistrer: false }));
  assert.strictEqual(reponse.status, 201);
  assert.strictEqual(reponse.body.enregistree, false);

  assert.deepStrictEqual((await client("GET", "/api/adresses")).body, []);
  assert.strictEqual(await Adresse.countDocuments(), 1);
});

test("US13 champs manquants : une erreur par champ obligatoire, rien n'est créé", async () => {
  const client = await connecter(baseUrl, "client");

  const reponse = await client("POST", "/api/adresses", {});
  assert.strictEqual(reponse.status, 400);
  for (const champ of ["rue", "ville", "codePostal", "telephone"]) {
    assert.ok(reponse.body.errors[champ], `erreur attendue pour ${champ}`);
  }
  assert.strictEqual(await Adresse.countDocuments(), 0);
});

test("US13 formats invalides : code postal, téléphone, numéro de rue, instructions trop longues", async () => {
  const client = await connecter(baseUrl, "client");
  const cas = [
    [{ codePostal: "10" }, "codePostal", /4 chiffres/],
    [{ telephone: "2200" }, "telephone", /8 chiffres/],
    [{ rue: "avenue Habib Bourguiba" }, "rue", /numéro/],
    [{ instructions: "x".repeat(201) }, "instructions", /200 caractères/],
  ];

  for (const [modification, champ, message] of cas) {
    const reponse = await client("POST", "/api/adresses", adresseValide(modification));
    assert.strictEqual(reponse.status, 400, champ);
    assert.match(reponse.body.errors[champ], message);
  }
  assert.strictEqual(await Adresse.countDocuments(), 0);
});

test("US13 panier : l'adresse choisie est associée au panier et réaffichée avec lui", async () => {
  const client = await connecter(baseUrl, "client");
  await remplirPanier(client);
  const adresse = (await client("POST", "/api/adresses", adresseValide())).body;

  const reponse = await client("PUT", "/api/panier/adresse", { adresseId: adresse._id });
  assert.strictEqual(reponse.status, 200);
  assert.strictEqual(reponse.body.adresse._id, adresse._id);

  // Le client revient plus tard : l'adresse est toujours là.
  const panier = await client("GET", "/api/panier");
  assert.strictEqual(panier.body.adresse.rue, "5 avenue Habib Bourguiba");
});

test("US13 panier vide : choix d'une adresse refusé (400)", async () => {
  const client = await connecter(baseUrl, "client");
  const adresse = (await client("POST", "/api/adresses", adresseValide())).body;

  const reponse = await client("PUT", "/api/panier/adresse", { adresseId: adresse._id });
  assert.strictEqual(reponse.status, 400);
  assert.match(reponse.body.message, /panier est vide/);
});

test("US13 adresse d'un autre client : invisible et refusée (404), id mal formé refusé (400)", async () => {
  const amira = await connecter(baseUrl, "client", "amira@mail.com");
  const sami = await connecter(baseUrl, "client", "sami@mail.com");
  const adresseAmira = (await amira("POST", "/api/adresses", adresseValide())).body;

  // Sami ne voit pas l'adresse d'Amira...
  assert.deepStrictEqual((await sami("GET", "/api/adresses")).body, []);

  // ...et ne peut pas l'utiliser pour son panier.
  await remplirPanier(sami);
  const reponse = await sami("PUT", "/api/panier/adresse", { adresseId: adresseAmira._id });
  assert.strictEqual(reponse.status, 404);
  assert.strictEqual((await sami("GET", "/api/panier")).body.adresse, undefined);

  const malForme = await sami("PUT", "/api/panier/adresse", { adresseId: "abc" });
  assert.strictEqual(malForme.status, 400);
});