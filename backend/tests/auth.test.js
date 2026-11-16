// Tests US01 (inscription client) et US02 (connexion client), sur une base MongoDB en mémoire.
const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { MongoMemoryServer } = require("mongodb-memory-server");

const app = require("../src/app");
const User = require("../src/models/User");
const { requireAuth, requireRole } = require("../src/middlewares/auth");

let mongod;
let server;
let baseUrl;

// Route de test protégée, pour vérifier requireRole sans dépendre des autres stories.
app.get("/api/test/client-only", requireAuth, requireRole("client"), (req, res) =>
  res.json({ ok: true })
);

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await User.init(); // crée l'index unique sur l'e-mail
  server = app.listen(0);
  baseUrl = `http://localhost:${server.address().port}`;
});

after(async () => {
  server.close();
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
});

// Petit client HTTP qui garde le cookie de session, comme un navigateur.
function agent() {
  let cookie = "";
  return async function call(method, path, body) {
    const res = await fetch(baseUrl + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0];
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null, setCookie };
  };
}

const validClient = () => ({
  role: "client",
  nom: "Ben Salah",
  prenom: "Amira",
  email: "Amira@Mail.com",
  telephone: "22000000",
  password: "secret123",
  passwordConfirm: "secret123",
});

async function createUser(overrides = {}) {
  return User.create({
    nom: "Test",
    prenom: "User",
    email: "user@mail.com",
    telephone: "22000000",
    passwordHash: await bcrypt.hash("secret123", 4),
    role: "client",
    actif: true,
    ...overrides,
  });
}

// ---------- US01 : inscription ----------

test("US01 inscription valide : compte client actif, e-mail en minuscules, mot de passe haché", async () => {
  const res = await agent()("POST", "/api/auth/register", validClient());
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.user.email, "amira@mail.com");
  assert.strictEqual(res.body.user.role, "client");
  assert.strictEqual(res.body.user.actif, true);
  assert.ok(!("passwordHash" in res.body.user), "le hash n'est jamais renvoyé");

  const saved = await User.findOne({ email: "amira@mail.com" }).select("+passwordHash");
  assert.notStrictEqual(saved.passwordHash, "secret123");
  assert.ok(await bcrypt.compare("secret123", saved.passwordHash));
});

test("US01 e-mail en doublon (casse ignorée) : refusé", async () => {
  const call = agent();
  await call("POST", "/api/auth/register", validClient());
  const res = await call("POST", "/api/auth/register", {
    ...validClient(),
    email: "AMIRA@mail.com",
  });
  assert.strictEqual(res.status, 409);
  assert.strictEqual(res.body.errors.email, "Cet e-mail est déjà utilisé");
  assert.strictEqual(await User.countDocuments(), 1);
});

test("US01 mot de passe faible ou confirmation différente : refusé, rien n'est créé", async () => {
  const call = agent();
  for (const password of ["court1", "sanschiffre", "12345678"]) {
    const res = await call("POST", "/api/auth/register", {
      ...validClient(),
      password,
      passwordConfirm: password,
    });
    assert.strictEqual(res.status, 400, password);
    assert.ok(res.body.errors.password, password);
  }
  const res = await call("POST", "/api/auth/register", {
    ...validClient(),
    passwordConfirm: "autre1234",
  });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.errors.passwordConfirm, "Les mots de passe ne correspondent pas");
  assert.strictEqual(await User.countDocuments(), 0);
});

test("US01 champs manquants et e-mail invalide : erreurs par champ", async () => {
  const res = await agent()("POST", "/api/auth/register", {
    role: "client",
    email: "pas-un-email",
  });
  assert.strictEqual(res.status, 400);
  for (const field of ["nom", "prenom", "telephone", "password", "passwordConfirm"]) {
    assert.ok(res.body.errors[field], field);
  }
  assert.strictEqual(res.body.errors.email, "Format d'e-mail invalide");
});

test("US01 aucun rôle coché : message et rien n'est créé", async () => {
  const { role, ...sansRole } = validClient();
  const res = await agent()("POST", "/api/auth/register", sansRole);
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.errors.role, "Veuillez choisir un rôle");
  assert.strictEqual(await User.countDocuments(), 0);
});

test("US01 tentative d'injection du rôle ou du statut : refusée", async () => {
  const call = agent();
  const asAdmin = await call("POST", "/api/auth/register", { ...validClient(), role: "admin" });
  assert.strictEqual(asAdmin.status, 400);
  assert.strictEqual(await User.countDocuments(), 0);

  // Champs supplémentaires ignorés : le compte reste un client actif normal.
  const res = await call("POST", "/api/auth/register", {
    ...validClient(),
    actif: false,
    passwordHash: "x",
  });
  assert.strictEqual(res.status, 201);
  const saved = await User.findOne({ email: "amira@mail.com" });
  assert.strictEqual(saved.role, "client");
  assert.strictEqual(saved.actif, true);
});

// ---------- US02 : connexion ----------

test("US02 bons identifiants : cookie httpOnly, redirection selon le rôle, /me sans hash", async () => {
  await createUser();
  const call = agent();
  const res = await call("POST", "/api/auth/login", {
    email: "USER@mail.com",
    password: "secret123",
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.redirect, "/mon-espace");
  assert.match(res.setCookie, /HttpOnly/i);

  const me = await call("GET", "/api/auth/me");
  assert.strictEqual(me.status, 200);
  assert.strictEqual(me.body.user.email, "user@mail.com");
  assert.strictEqual(me.body.user.role, "client");
  assert.ok(!("passwordHash" in me.body.user));
});

test("US02 redirection par rôle : livreur vers /livreur, agent vers /admin", async () => {
  await createUser({ email: "livreur@mail.com", role: "livreur" });
  await createUser({ email: "agent@mail.com", role: "admin" });
  const l = await agent()("POST", "/api/auth/login", { email: "livreur@mail.com", password: "secret123" });
  const a = await agent()("POST", "/api/auth/login", { email: "agent@mail.com", password: "secret123" });
  assert.strictEqual(l.body.redirect, "/livreur");
  assert.strictEqual(a.body.redirect, "/admin");
});

test("US02 mauvais identifiants : message générique, sans préciser le champ", async () => {
  await createUser();
  const wrongPassword = await agent()("POST", "/api/auth/login", {
    email: "user@mail.com",
    password: "mauvais123",
  });
  const unknownEmail = await agent()("POST", "/api/auth/login", {
    email: "inconnu@mail.com",
    password: "secret123",
  });
  for (const res of [wrongPassword, unknownEmail]) {
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.message, "Identifiants incorrects");
    assert.strictEqual(res.setCookie, null, "aucune session créée");
  }
});

test("US02 compte désactivé : connexion refusée", async () => {
  await createUser({ actif: false });
  const res = await agent()("POST", "/api/auth/login", {
    email: "user@mail.com",
    password: "secret123",
  });
  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.body.message, "Identifiants incorrects");
});

test("US02 accès sans session : 401 sur les routes protégées", async () => {
  const call = agent();
  assert.strictEqual((await call("GET", "/api/auth/me")).status, 401);
  assert.strictEqual((await call("GET", "/api/test/client-only")).status, 401);
});

test("US02 requireRole : un livreur reçoit 403 sur une route client", async () => {
  await createUser({ email: "livreur@mail.com", role: "livreur" });
  const call = agent();
  await call("POST", "/api/auth/login", { email: "livreur@mail.com", password: "secret123" });
  assert.strictEqual((await call("GET", "/api/test/client-only")).status, 403);
});

test("US02 compte désactivé pendant la session : accès coupé", async () => {
  const user = await createUser();
  const call = agent();
  await call("POST", "/api/auth/login", { email: "user@mail.com", password: "secret123" });
  assert.strictEqual((await call("GET", "/api/auth/me")).status, 200);
  await User.updateOne({ _id: user._id }, { actif: false });
  assert.strictEqual((await call("GET", "/api/auth/me")).status, 401);
});

test("US02 déconnexion : session détruite et cookie effacé", async () => {
  await createUser();
  const call = agent();
  await call("POST", "/api/auth/login", { email: "user@mail.com", password: "secret123" });
  const out = await call("POST", "/api/auth/logout");
  assert.strictEqual(out.status, 200);
  assert.match(out.setCookie, /sid=;/);
  assert.strictEqual((await call("GET", "/api/auth/me")).status, 401);
});
