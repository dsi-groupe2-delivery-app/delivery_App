const test = require("node:test");
const assert = require("node:assert");
const app = require("../src/app");

// Démarre l'app sur un port libre, appelle une route, puis arrête le serveur
async function call(path) {
  const server = app.listen(0);
  const { port } = server.address();
  try {
    return await fetch(`http://localhost:${port}${path}`, { redirect: "manual" });
  } finally {
    server.close();
  }
}

test("GET /health returns ok", async () => {
  const res = await call("/health");
  const body = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(body.status, "ok");
  assert.ok("db" in body, "la réponse indique l'état de la base");
});

test("GET /api/health returns ok", async () => {
  const res = await call("/api/health");
  assert.strictEqual(res.status, 200);
  assert.strictEqual((await res.json()).status, "ok");
});

test("GET /admin sans connexion redirige vers la page de connexion", async () => {
  const res = await call("/admin");
  assert.strictEqual(res.status, 302);
  assert.match(res.headers.get("location"), /\/connexion$/);
});
