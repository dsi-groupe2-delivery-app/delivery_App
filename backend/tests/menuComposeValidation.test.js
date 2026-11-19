const test = require("node:test");
const assert = require("node:assert");
const { validateMenuStructure, findSingleOptionGroups } = require("../src/validators/menuComposeValidation");
 
const ok = () => ({
  nom: "Menu Kids",
  prixBase: 12,
  groupes: [{ libelle: "Plat", min: 1, max: 1, options: [{ produit: "a", supplement: 0 }, { produit: "b", supplement: 0 }] }],
});
 
test("US08 validation : accepte un menu valide", () => {
  assert.deepStrictEqual(validateMenuStructure(ok()), {});
});
 
test("US08 validation : nom obligatoire", () => {
  assert.ok(validateMenuStructure({ ...ok(), nom: " " }).nom);
});
 
test("US08 validation : prix de base > 0", () => {
  assert.ok(validateMenuStructure({ ...ok(), prixBase: 0 }).prixBase);
  assert.ok(validateMenuStructure({ ...ok(), prixBase: NaN }).prixBase);
});
 
test("US08 validation : au moins 1 groupe", () => {
  assert.ok(validateMenuStructure({ ...ok(), groupes: [] }).general);
});
 
test("US08 validation : max ne dépasse pas le nombre d'options", () => {
  const m = ok();
  m.groupes[0].max = 3;
  assert.match(validateMenuStructure(m).groupes[0].max, /dépasse/);
});
 
test("US08 validation : max >= min et max >= 1", () => {
  const m = ok();
  m.groupes[0].min = 2;
  m.groupes[0].max = 1;
  assert.ok(validateMenuStructure(m).groupes[0].max);
  m.groupes[0].max = 0;
  assert.ok(validateMenuStructure(m).groupes[0].max);
});
 
test("US08 validation : min >= 0", () => {
  const m = ok();
  m.groupes[0].min = -1;
  assert.ok(validateMenuStructure(m).groupes[0].min);
});
 
test("US08 validation : au moins 1 option par groupe", () => {
  const m = ok();
  m.groupes[0].options = [];
  assert.ok(validateMenuStructure(m).groupes[0].options);
});
 
test("US08 validation : produit en double dans un groupe", () => {
  const m = ok();
  m.groupes[0].options[1].produit = "a";
  assert.match(validateMenuStructure(m).groupes[0].items[1], /déjà/);
});
 
test("US08 validation : supplément >= 0", () => {
  const m = ok();
  m.groupes[0].options[0].supplement = -1;
  assert.ok(validateMenuStructure(m).groupes[0].items[0]);
});
 
test("US08 validation : avertit pour un groupe à une seule option", () => {
  const m = ok();
  m.groupes[0].options = [{ produit: "a", supplement: 0 }];
  assert.deepStrictEqual(findSingleOptionGroups(m.groupes), [0]);
});
 
