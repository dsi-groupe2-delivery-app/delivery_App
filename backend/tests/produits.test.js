// Tests US06 (ajout) et US07 (liste et modification) des produits, sur une base MongoDB en mémoire.
const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { MongoMemoryServer } = require("mongodb-memory-server");

const app = require("../src/app");
const User = require("../src/models/User");
const Category = require("../src/models/Category");
const Product = require("../src/models/Product");
const { UPLOADS_DIR } = require("../src/config/upload");
const { tndVersMillimes, millimesVersTnd } = require("../src/utils/prix");

let mongod;
let server;
let baseUrl;

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await Promise.all([User.init(), Category.init()]);
  server = app.listen(0);
  baseUrl = `http://localhost:${server.address().port}`;
});

after(async () => {
  server.close();
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  // On supprime les images créées par le test précédent.
  for (const produit of await Product.find({ image: { $ne: null } })) {
    fs.rmSync(path.join(UPLOADS_DIR, produit.image), { force: true });
  }
  await Promise.all([User.deleteMany({}), Category.deleteMany({}), Product.deleteMany({})]);
});

// Petit navigateur : garde le cookie de session et ne suit pas les redirections.
// body peut être un objet (envoyé en formulaire) ou un FormData (avec fichier).
function navigateur() {
  let cookie = "";
  return async function call(method, chemin, body) {
    const headers = cookie ? { Cookie: cookie } : {};
    let data = body;
    if (body && !(body instanceof FormData)) {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      data = new URLSearchParams(body).toString();
    }
    if (chemin === "/api/auth/login") {
      headers["Content-Type"] = "application/json";
      data = JSON.stringify(body);
    }
    const res = await fetch(baseUrl + chemin, { method, redirect: "manual", headers, body: data });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0];
    return { status: res.status, location: res.headers.get("location"), text: await res.text() };
  };
}

// Crée un compte et renvoie un navigateur déjà connecté avec ce compte.
async function connecter(role) {
  const email = `${role}@mail.com`;
  await User.create({
    nom: "Trabelsi",
    prenom: "Sami",
    email,
    telephone: "22000000",
    passwordHash: await bcrypt.hash("secret123", 4),
    role,
  });
  const call = navigateur();
  await call("POST", "/api/auth/login", { email, password: "secret123" });
  return call;
}

// Formulaire produit, avec une image facultative.
function formulaireProduit(champs, image) {
  const form = new FormData();
  for (const [cle, valeur] of Object.entries(champs)) form.append(cle, valeur);
  if (image) form.append("image", new Blob([image.contenu], { type: image.type }), image.nom);
  return form;
}

// ---------- Conversion des prix ----------

test("US06 conversion TND <-> millimes", () => {
  assert.strictEqual(tndVersMillimes("12.500"), 12500);
  assert.strictEqual(tndVersMillimes("12,5"), 12500);
  assert.strictEqual(tndVersMillimes("abc"), null);
  assert.strictEqual(tndVersMillimes("1.2345"), null); // plus de 3 décimales
  assert.strictEqual(millimesVersTnd(12500), "12.500");
});

// ---------- Index (obligatoires pour les tris sur Cosmos DB) ----------

test("US06 index : chaque tri utilisé a son index dans le modèle", async () => {
  await Product.init();
  const clesCategorie = (await Category.collection.indexes()).map((i) => JSON.stringify(i.key));
  const clesProduit = (await Product.collection.indexes()).map((i) => JSON.stringify(i.key));

  assert.ok(clesCategorie.includes(JSON.stringify({ ordre: 1, nom: 1 })));
  assert.ok(clesProduit.includes(JSON.stringify({ nom: 1 })));
});

// ---------- Catégories ----------

test("US06 catégorie : création valide puis affichage dans la liste", async () => {
  const call = await connecter("admin");

  const reponse = await call("POST", "/admin/categories", { nom: "Desserts", ordre: "2" });
  assert.strictEqual(reponse.status, 302);

  const page = await call("GET", "/admin/categories");
  assert.match(page.text, /Catégorie « Desserts » ajoutée/);
  assert.strictEqual(await Category.countDocuments(), 1);
});

test("US06 catégorie : doublon refusé sans tenir compte des majuscules", async () => {
  const call = await connecter("admin");
  await Category.create({ nom: "Desserts" });

  const reponse = await call("POST", "/admin/categories", { nom: "DESSERTS" });
  assert.strictEqual(reponse.status, 400);
  assert.match(reponse.text, /existe déjà/);
  assert.strictEqual(await Category.countDocuments(), 1);
});

test("US06 catégorie : nom trop court refusé", async () => {
  const call = await connecter("admin");
  const reponse = await call("POST", "/admin/categories", { nom: "A" });
  assert.strictEqual(reponse.status, 400);
  assert.strictEqual(await Category.countDocuments(), 0);
});

// ---------- Produits ----------

test("US06 produit : création valide, rangé sous sa catégorie", async () => {
  const call = await connecter("admin");
  const categorie = await Category.create({ nom: "Pizzas" });

  const reponse = await call(
    "POST",
    "/admin/produits",
    formulaireProduit(
      { nom: "Margherita", prix: "12.500", categorie: String(categorie._id), disponible: "on" },
      { contenu: "fausse image", type: "image/png", nom: "pizza.png" }
    )
  );
  assert.strictEqual(reponse.status, 302);

  const produit = await Product.findOne({ nom: "Margherita" });
  assert.strictEqual(produit.prixMillimes, 12500);
  assert.strictEqual(produit.disponible, true);
  assert.ok(produit.image.endsWith(".png"));

  const page = await call("GET", "/admin/categories");
  assert.match(page.text, /Produit « Margherita » ajouté/);
  assert.match(page.text, /Margherita/);
  assert.match(page.text, /12\.500 TND/);
});

test("US06 produit : sans image, l'image par défaut est affichée", async () => {
  const call = await connecter("admin");
  const categorie = await Category.create({ nom: "Boissons" });

  await call("POST", "/admin/produits", formulaireProduit({ nom: "Eau", prix: "1", categorie: String(categorie._id) }));

  const page = await call("GET", "/admin/categories");
  assert.match(page.text, /produit-defaut\.svg/);
});

test("US06 produit : prix nul ou négatif refusé, rien n'est créé", async () => {
  const call = await connecter("admin");
  const categorie = await Category.create({ nom: "Pizzas" });

  for (const prix of ["0", "-5"]) {
    const reponse = await call(
      "POST",
      "/admin/produits",
      formulaireProduit({ nom: "Margherita", prix, categorie: String(categorie._id) })
    );
    assert.strictEqual(reponse.status, 400);
    assert.match(reponse.text, /Le prix doit être supérieur à 0/);
    assert.match(reponse.text, /value="Margherita"/); // la saisie est conservée
  }
  assert.strictEqual(await Product.countDocuments(), 0);
});

test("US06 produit : catégorie inexistante refusée", async () => {
  const call = await connecter("admin");
  await Category.create({ nom: "Pizzas" });

  const reponse = await call(
    "POST",
    "/admin/produits",
    formulaireProduit({ nom: "Margherita", prix: "10", categorie: String(new mongoose.Types.ObjectId()) })
  );
  assert.strictEqual(reponse.status, 400);
  assert.match(reponse.text, /Choisissez une catégorie existante/);
  assert.strictEqual(await Product.countDocuments(), 0);
});

test("US06 produit : image non conforme refusée (mauvais format ou plus de 2 Mo)", async () => {
  const call = await connecter("admin");
  const categorie = await Category.create({ nom: "Pizzas" });
  const champs = { nom: "Margherita", prix: "10", categorie: String(categorie._id) };

  const mauvaisFormat = await call(
    "POST",
    "/admin/produits",
    formulaireProduit(champs, { contenu: "texte", type: "text/plain", nom: "pizza.txt" })
  );
  assert.strictEqual(mauvaisFormat.status, 400);
  assert.match(mauvaisFormat.text, /formats acceptés jpg, png ou webp/);

  const tropLourde = await call(
    "POST",
    "/admin/produits",
    formulaireProduit(champs, { contenu: new Uint8Array(3 * 1024 * 1024), type: "image/png", nom: "grande.png" })
  );
  assert.strictEqual(tropLourde.status, 400);
  assert.match(tropLourde.text, /2 Mo maximum/);

  assert.strictEqual(await Product.countDocuments(), 0);
});

test("US06 sans catégorie : le formulaire invite à en créer une", async () => {
  const call = await connecter("admin");
  const page = await call("GET", "/admin/produits/new");
  assert.strictEqual(page.status, 200);
  assert.match(page.text, /Créez d'abord une catégorie/);
});

// ---------- Accès ----------

test("US06 accès : client refusé (403), visiteur redirigé vers la connexion", async () => {
  const client = await connecter("client");
  assert.strictEqual((await client("GET", "/admin/categories")).status, 403);
  assert.strictEqual((await client("POST", "/admin/categories", { nom: "Pizzas" })).status, 403);

  const visiteur = navigateur();
  const page = await visiteur("GET", "/admin/produits/new");
  assert.strictEqual(page.status, 302);
  assert.match(page.location, /\/connexion$/);

  assert.strictEqual(await Category.countDocuments(), 0);
});
// ---------- US07 : liste et modification des produits ----------

// Crée la catégorie Pizzas avec un produit « Margherita » à 12.500 TND.
async function produitDeDepart(image = null) {
  const pizzas = await Category.create({ nom: "Pizzas", ordre: 1 });
  const produit = await Product.create({ nom: "Margherita", prixMillimes: 12500, categorie: pizzas._id, image });
  return { pizzas, produit };
}

// Formulaire valide ; on remplace seulement les champs utiles au test.
function champs(categorie, autres = {}) {
  return Object.assign({ nom: "Margherita", prix: "12.500", categorie: String(categorie._id), disponible: "on" }, autres);
}

// Envoie le formulaire de modification (POST + _method=PUT, comme le navigateur).
function modifier(call, id, valeurs, image) {
  return call("POST", `/admin/produits/${id}?_method=PUT`, formulaireProduit(valeurs, image));
}

// Relit le produit en base après la requête.
const relire = (produit) => Product.findById(produit._id);

// Crée un faux fichier image dans uploads et renvoie son nom.
function imageSurDisque() {
  const nom = `${new mongoose.Types.ObjectId()}.png`;
  fs.writeFileSync(path.join(UPLOADS_DIR, nom), "ancienne image");
  return nom;
}

const existe = (nom) => fs.existsSync(path.join(UPLOADS_DIR, nom));

test("US07 liste : tous les produits, filtre par catégorie, filtre invalide ignoré", async () => {
  const call = await connecter("admin");
  await produitDeDepart();
  const desserts = await Category.create({ nom: "Desserts", ordre: 2 });
  await Product.create({ nom: "Tiramisu", prixMillimes: 6000, categorie: desserts._id, disponible: false });

  const tous = await call("GET", "/admin/produits");
  assert.strictEqual(tous.status, 200);
  assert.match(tous.text, /Margherita/);
  assert.match(tous.text, /12\.500 TND/);
  assert.match(tous.text, /Indisponible/);

  const filtre = await call("GET", `/admin/produits?categorie=${desserts._id}`);
  assert.match(filtre.text, /Tiramisu/);
  assert.doesNotMatch(filtre.text, /Margherita/);

  // Filtre invalide : pas d'erreur, tous les produits sont affichés.
  const invalide = await call("GET", "/admin/produits?categorie=abc");
  assert.strictEqual(invalide.status, 200);
  assert.match(invalide.text, /Margherita/);
  assert.match(invalide.text, /Tiramisu/);
});

test("US07 formulaire : pré-rempli avec les valeurs actuelles du produit", async () => {
  const call = await connecter("admin");
  const { pizzas, produit } = await produitDeDepart();

  const page = await call("GET", `/admin/produits/${produit._id}/edit`);
  assert.strictEqual(page.status, 200);
  assert.match(page.text, /value="Margherita"/);
  assert.match(page.text, /value="12\.500"/);
  assert.match(page.text, new RegExp(`value="${pizzas._id}" selected`));
  assert.match(page.text, /name="disponible" checked/);
  assert.match(page.text, new RegExp(`/admin/produits/${produit._id}\\?_method=PUT`));
});

test("US07 modification valide : nom, prix, catégorie et indisponibilité", async () => {
  const call = await connecter("admin");
  const { produit } = await produitDeDepart();
  const desserts = await Category.create({ nom: "Desserts", ordre: 2 });

  // Case « Disponible » décochée : le navigateur n'envoie pas le champ.
  const valeurs = champs(desserts, { nom: "Margherita XL", prix: "15" });
  delete valeurs.disponible;

  const reponse = await modifier(call, produit._id, valeurs);
  assert.strictEqual(reponse.status, 302);
  assert.strictEqual(reponse.location, "/admin/produits");

  const apres = await relire(produit);
  assert.strictEqual(apres.nom, "Margherita XL");
  assert.strictEqual(apres.prixMillimes, 15000);
  assert.ok(apres.categorie.equals(desserts._id));
  assert.strictEqual(apres.disponible, false);

  const page = await call("GET", "/admin/produits");
  assert.match(page.text, /Produit « Margherita XL » modifié avec succès/);
});

test("US07 validation : erreurs affichées, saisie conservée, rien n'est modifié", async () => {
  const call = await connecter("admin");
  const { produit } = await produitDeDepart();
  const inconnue = { _id: new mongoose.Types.ObjectId() };

  const reponse = await modifier(call, produit._id, champs(inconnue, { nom: "", prix: "0" }));
  assert.strictEqual(reponse.status, 400);
  assert.match(reponse.text, /Le nom est obligatoire/);
  assert.match(reponse.text, /Le prix doit être supérieur à 0/);
  assert.match(reponse.text, /Choisissez une catégorie existante/);
  assert.match(reponse.text, /value="0"/); // saisie conservée
  assert.match(reponse.text, /_method=PUT/); // toujours en mode modification

  const apres = await relire(produit);
  assert.strictEqual(apres.nom, "Margherita");
  assert.strictEqual(apres.prixMillimes, 12500);
});

test("US07 image : gardée sans nouvel envoi, remplacée sinon (ancien fichier supprimé)", async () => {
  const call = await connecter("admin");
  const ancienne = imageSurDisque();
  const { pizzas, produit } = await produitDeDepart(ancienne);

  // Sans fichier : l'image est gardée. Un champ texte « image » piégé est ignoré.
  await modifier(call, produit._id, champs(pizzas, { image: "../../.env" }));
  assert.strictEqual((await relire(produit)).image, ancienne);
  assert.ok(existe(ancienne));

  // Avec un fichier : nouvelle image enregistrée, ancienne supprimée du disque (T5).
  const reponse = await modifier(call, produit._id, champs(pizzas), {
    contenu: "nouvelle image",
    type: "image/png",
    nom: "pizza.png",
  });
  assert.strictEqual(reponse.status, 302);

  const nouvelle = (await relire(produit)).image;
  assert.notStrictEqual(nouvelle, ancienne);
  assert.ok(existe(nouvelle));
  assert.ok(!existe(ancienne));
});

test("US07 image refusée (mauvais format ou plus de 2 Mo) : rien n'est modifié", async () => {
  const call = await connecter("admin");
  const { pizzas, produit } = await produitDeDepart();
  const valeurs = champs(pizzas, { prix: "20" });
  const fichiersAvant = fs.readdirSync(UPLOADS_DIR).length;

  const mauvaisFormat = await modifier(call, produit._id, valeurs, {
    contenu: "texte",
    type: "text/plain",
    nom: "pizza.txt",
  });
  assert.strictEqual(mauvaisFormat.status, 400);
  assert.match(mauvaisFormat.text, /formats acceptés jpg, png ou webp/);

  const tropLourde = await modifier(call, produit._id, valeurs, {
    contenu: new Uint8Array(3 * 1024 * 1024),
    type: "image/png",
    nom: "grande.png",
  });
  assert.strictEqual(tropLourde.status, 400);
  assert.match(tropLourde.text, /2 Mo maximum/);

  assert.strictEqual((await relire(produit)).prixMillimes, 12500);
  assert.strictEqual(fs.readdirSync(UPLOADS_DIR).length, fichiersAvant); // aucun fichier ajouté
});

test("US07 produit introuvable : 404 pour un id mal formé ou inconnu", async () => {
  const call = await connecter("admin");
  const pizzas = await Category.create({ nom: "Pizzas" });
  const inconnu = new mongoose.Types.ObjectId();

  for (const id of ["abc", inconnu]) {
    const page = await call("GET", `/admin/produits/${id}/edit`);
    assert.strictEqual(page.status, 404);
    assert.match(page.text, /Produit introuvable/);
  }

  const reponse = await modifier(call, inconnu, champs(pizzas));
  assert.strictEqual(reponse.status, 404);
  assert.strictEqual(await Product.countDocuments(), 0);
});

test("US07 accès : client refusé (403), visiteur redirigé vers la connexion", async () => {
  const { pizzas, produit } = await produitDeDepart();

  const client = await connecter("client");
  assert.strictEqual((await client("GET", "/admin/produits")).status, 403);
  assert.strictEqual((await client("GET", `/admin/produits/${produit._id}/edit`)).status, 403);
  const tentative = await modifier(client, produit._id, champs(pizzas, { nom: "Piratée" }));
  assert.strictEqual(tentative.status, 403);

  const visiteur = navigateur();
  const page = await visiteur("GET", `/admin/produits/${produit._id}/edit`);
  assert.strictEqual(page.status, 302);
  assert.match(page.location, /\/connexion$/);

  assert.strictEqual((await relire(produit)).nom, "Margherita");
});