// Tests US03 (connexion de l'agent au Back-Office), sur une base MongoDB en mémoire.
const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { MongoMemoryServer } = require("mongodb-memory-server");

const app = require("../src/app");
const User = require("../src/models/User");

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
  server.close();
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
});

// Petit navigateur : garde le cookie de session et ne suit pas les redirections.
function navigateur() {
  let cookie = "";
  return async function call(method, path, body) {
    const res = await fetch(baseUrl + path, {
      method,
      redirect: "manual",
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0];
    return { status: res.status, location: res.headers.get("location"), text: await res.text() };
  };
}

async function creerCompte(role, email) {
  return User.create({
    nom: "Trabelsi",
    prenom: "Sami",
    email,
    telephone: "22000000",
    passwordHash: await bcrypt.hash("secret123", 4),
    role,
    actif: true,
  });
}

test("US03 page de connexion de l'agent : formulaire EJS affiché", async () => {
  const page = await navigateur()("GET", "/admin/connexion");
  assert.strictEqual(page.status, 200);
  assert.match(page.text, /Espace réservé aux agents/);
  assert.match(page.text, /action="\/admin\/connexion"/);
});

test("US03 agent : connexion sur la page EJS puis accès au Back-Office avec son nom", async () => {
  await creerCompte("admin", "agent@mail.com");
  const call = navigateur();

  // E-mail en majuscules : la casse est ignorée.
  const login = await call("POST", "/admin/connexion", { email: "Agent@Mail.com", password: "secret123" });
  assert.strictEqual(login.status, 302);
  assert.strictEqual(login.location, "/admin");

  const page = await call("GET", "/admin");
  assert.strictEqual(page.status, 200);
  assert.match(page.text, /Back-Office restaurant/);
  assert.match(page.text, /Sami Trabelsi/);
});

test("US03 mauvais mot de passe : message d'erreur, pas d'accès", async () => {
  await creerCompte("admin", "agent@mail.com");
  const call = navigateur();

  const login = await call("POST", "/admin/connexion", { email: "agent@mail.com", password: "faux" });
  assert.strictEqual(login.status, 401);
  assert.match(login.text, /Identifiants incorrects/);
  assert.match(login.text, /value="agent@mail.com"/); // l'e-mail saisi est conservé

  assert.strictEqual((await call("GET", "/admin")).status, 302);
});

test("US03 un client ne peut pas se connecter sur la page de l'agent", async () => {
  await creerCompte("client", "client@mail.com");
  const call = navigateur();

  const login = await call("POST", "/admin/connexion", { email: "client@mail.com", password: "secret123" });
  assert.strictEqual(login.status, 401);
  assert.strictEqual((await call("GET", "/admin")).status, 302);
});

test("US03 visiteur non connecté : redirigé vers la page de connexion de l'agent", async () => {
  const page = await navigateur()("GET", "/admin");
  assert.strictEqual(page.status, 302);
  assert.strictEqual(page.location, "/admin/connexion");
});

test("US03 client connecté : accès au Back-Office refusé (403)", async () => {
  await creerCompte("client", "client@mail.com");
  const call = navigateur();
  await call("POST", "/api/auth/login", { email: "client@mail.com", password: "secret123" });

  const page = await call("GET", "/admin");
  assert.strictEqual(page.status, 403);
});

test("US03 déconnexion : retour à la connexion, le Back-Office n'est plus accessible", async () => {
  await creerCompte("admin", "agent@mail.com");
  const call = navigateur();
  await call("POST", "/admin/connexion", { email: "agent@mail.com", password: "secret123" });

  const logout = await call("POST", "/admin/logout");
  assert.strictEqual(logout.status, 302);
  assert.strictEqual(logout.location, "/admin/connexion");

  const page = await call("GET", "/admin");
  assert.strictEqual(page.status, 302);
});
