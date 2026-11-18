const { computeMenuComposePrice, MenuChoiceError } = require('../src/utils/computeMenuComposePrice');
const menu = {
  prixBase: 12,
  groupes: [
    { _id: 'g1', libelle: 'Plat', min: 1, max: 1, options: [{ produit: 'p1', supplement: 0 }, { produit: 'p2', supplement: 0 }] },
    { _id: 'g2', libelle: 'Boisson', min: 1, max: 1, options: [{ produit: 'p3', supplement: 0 }, { produit: 'p4', supplement: 1.5 }] },
    { _id: 'g3', libelle: 'Dessert', min: 0, max: 1, options: [{ produit: 'p5', supplement: 0 }, { produit: 'p6', supplement: 0 }] },
  ],
};
describe('computeMenuComposePrice', () => {
  it('prix de base seul quand aucun supplément', () => {
    expect(computeMenuComposePrice(menu, { g1: ['p1'], g2: ['p3'] }).total).toBe(12);
  });
  it('ajoute les suppléments (Menu Kids : 12 + 1.5 = 13.5)', () => {
    const r = computeMenuComposePrice(menu, { g1: ['p2'], g2: ['p4'], g3: ['p5'] });
    expect(r.total).toBe(13.5);
    expect(r.supplements).toBe(1.5);
  });
  it('évite les erreurs flottantes (0.1 + 0.2)', () => {
    const m = { prixBase: 1, groupes: [{ _id: 'g', libelle: 'X', min: 0, max: 2, options: [{ produit: 'a', supplement: 0.1 }, { produit: 'b', supplement: 0.2 }] }] };
    expect(computeMenuComposePrice(m, { g: ['a', 'b'] }).total).toBe(1.3);
  });
  it('refuse si un minimum n’est pas atteint', () => {
    expect(() => computeMenuComposePrice(menu, { g1: ['p1'] })).toThrow(MenuChoiceError);
  });
  it('refuse si le maximum est dépassé', () => {
    expect(() => computeMenuComposePrice(menu, { g1: ['p1', 'p2'], g2: ['p3'] })).toThrow(MenuChoiceError);
  });
  it('refuse une option qui n’appartient pas au groupe ou un groupe inconnu', () => {
    expect(() => computeMenuComposePrice(menu, { g1: ['p3'], g2: ['p3'] })).toThrow(MenuChoiceError);
    expect(() => computeMenuComposePrice(menu, { g1: ['p1'], g2: ['p3'], zz: ['p1'] })).toThrow(MenuChoiceError);
  });
});
