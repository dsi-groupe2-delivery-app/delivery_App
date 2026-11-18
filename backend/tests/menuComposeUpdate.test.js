// US09 – modification de la composition (ajout, retrait, réordonnancement de groupes)
const test = require("node:test");
const assert = require("node:assert");
const { normalizeMenuBody } = require("../src/validators/menuComposeForm");
const { validateMenuStructure } = require("../src/validators/menuComposeValidation");

const P = (n) => n.toString(16).padStart(24, "0");
const grp = (libelle, id) => ({
  _id: id,
  libelle,
  min: "1",
  max: "1",
  options: { 0: { produit: P(1), supplement: "0" }, 1: { produit: P(2), supplement: "1,5" } },
});
const base = { nom: "Menu Kids", prixBase: "12.000", disponible: "on" };

test("US09 réordonnancement : l'ordre des index devient `ordre`, les _id sont conservés", () => {
  const body = { ...base, groupes: { 0: grp("Boisson", P(11)), 1: grp("Plat", P(10)) } };
  const d = normalizeMenuBody(body);
  assert.deepStrictEqual(d.groupes.map((g) => g.libelle), ["Boisson", "Plat"]);
  assert.deepStrictEqual(d.groupes.map((g) => g.ordre), [0, 1]);
  assert.strictEqual(d.groupes[0]._id, P(11));
});

test("US09 ajout d'un groupe (sans _id) et retrait d'un groupe (index absent)", () => {
  const body = { ...base, groupes: { 0: grp("Plat", P(10)), 2: grp("Dessert", "") } };
  const d = normalizeMenuBody(body);
  assert.strictEqual(d.groupes.length, 2);
  assert.strictEqual(d.groupes[1].libelle, "Dessert");
  assert.strictEqual(d.groupes[1]._id, undefined);
});

test("US09 supplément avec virgule et prix valides", () => {
  const d = normalizeMenuBody({ ...base, groupes: { 0: grp("Plat", P(10)) } });
  assert.strictEqual(d.groupes[0].options[1].supplement, 1.5);
  assert.deepStrictEqual(validateMenuStructure(d), {});
});

test("US09 retirer tous les groupes est refusé", () => {
  assert.ok(validateMenuStructure(normalizeMenuBody(base)).general);
});
