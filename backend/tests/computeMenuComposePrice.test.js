const test = require("node:test");
const assert = require("node:assert");
const { computeMenuComposePrice, MenuChoiceError } = require("../src/utils/computeMenuComposePrice");

const menu = {
  prixBase: 12,
  groupes: [
    { _id: "g1", libelle: "Plat", min: 1, max: 1, options: [{ produit: "p1", supplement: 0 }, { produit: "p2", supplement: 0 }] },
    { _id: "g2", libelle: "Boisson", min: 1, max: 1, options: [{ produit: "p3", supplement: 0 }, { produit: "p4", supplement: 1.5 }] },
    { _id: "g3", libelle: "Dessert", min: 0, max: 1, options: [{ produit: "p5", supplement: 0 }, { produit: "p6", supplement: 0 }] },
  ],
};

test("US08 prix : prix de base seul quand aucun supplément", () => {
  assert.strictEqual(computeMenuComposePrice(menu, { g1: ["p1"], g2: ["p3"] }).total, 12);
});

test("US08 prix : ajoute les suppléments (Menu Kids : 12 + 1.5 = 13.5)", () => {
  const r = computeMenuComposePrice(menu, { g1: ["p2"], g2: ["p4"], g3: ["p5"] });
  assert.strictEqual(r.total, 13.5);
  assert.strictEqual(r.supplements, 1.5);
});

test("US08 prix : évite les erreurs flottantes (0.1 + 0.2)", () => {
  const m = { prixBase: 1, groupes: [{ _id: "g", libelle: "X", min: 0, max: 2, options: [{ produit: "a", supplement: 0.1 }, { produit: "b", supplement: 0.2 }] }] };
  assert.strictEqual(computeMenuComposePrice(m, { g: ["a", "b"] }).total, 1.3);
});

test("US08 prix : refuse si un minimum n'est pas atteint", () => {
  assert.throws(() => computeMenuComposePrice(menu, { g1: ["p1"] }), MenuChoiceError);
});

test("US08 prix : refuse si le maximum est dépassé", () => {
  assert.throws(() => computeMenuComposePrice(menu, { g1: ["p1", "p2"], g2: ["p3"] }), MenuChoiceError);
});

test("US08 prix : refuse une option étrangère au groupe ou un groupe inconnu", () => {
  assert.throws(() => computeMenuComposePrice(menu, { g1: ["p3"], g2: ["p3"] }), MenuChoiceError);
  assert.throws(() => computeMenuComposePrice(menu, { g1: ["p1"], g2: ["p3"], zz: ["p1"] }), MenuChoiceError);
});
