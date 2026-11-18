const { validateMenuStructure, findSingleOptionGroups } = require('../src/validators/menuComposeValidation');
const ok = () => ({
  nom: 'Menu Kids',
  prixBase: 12,
  groupes: [{ libelle: 'Plat', min: 1, max: 1, options: [{ produit: 'a', supplement: 0 }, { produit: 'b', supplement: 0 }] }],
});
describe('validateMenuStructure', () => {
  it('accepte un menu valide', () => expect(validateMenuStructure(ok())).toEqual({}));
  it('nom obligatoire', () => expect(validateMenuStructure({ ...ok(), nom: ' ' }).nom).toBeDefined());
  it('prix de base > 0', () => {
    expect(validateMenuStructure({ ...ok(), prixBase: 0 }).prixBase).toBeDefined();
    expect(validateMenuStructure({ ...ok(), prixBase: NaN }).prixBase).toBeDefined();
  });
  it('au moins 1 groupe', () => expect(validateMenuStructure({ ...ok(), groupes: [] }).general).toBeDefined());
  it('max ne dépasse pas le nombre d’options', () => {
    const m = ok();
    m.groupes[0].max = 3;
    expect(validateMenuStructure(m).groupes[0].max).toMatch(/dépasse/);
  });
  it('max >= min et max >= 1', () => {
    const m = ok();
    m.groupes[0].min = 2; m.groupes[0].max = 1;
    expect(validateMenuStructure(m).groupes[0].max).toBeDefined();
    m.groupes[0].max = 0;
    expect(validateMenuStructure(m).groupes[0].max).toBeDefined();
  });
  it('min >= 0', () => {
    const m = ok(); m.groupes[0].min = -1;
    expect(validateMenuStructure(m).groupes[0].min).toBeDefined();
  });
  it('au moins 1 option par groupe', () => {
    const m = ok(); m.groupes[0].options = [];
    expect(validateMenuStructure(m).groupes[0].options).toBeDefined();
  });
  it('produit en double dans un groupe', () => {
    const m = ok(); m.groupes[0].options[1].produit = 'a';
    expect(validateMenuStructure(m).groupes[0].items[1]).toMatch(/déjà/);
  });
  it('supplément >= 0', () => {
    const m = ok(); m.groupes[0].options[0].supplement = -1;
    expect(validateMenuStructure(m).groupes[0].items[0]).toBeDefined();
  });
  it('avertit pour un groupe à une seule option', () => {
    const m = ok(); m.groupes[0].options = [{ produit: 'a', supplement: 0 }];
    expect(findSingleOptionGroups(m.groupes)).toEqual([0]);
  });
});
