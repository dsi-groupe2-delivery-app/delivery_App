import { GroupeMenu, MenuDetail } from './catalogue.models';
import { basculerOption, problemesChoix, regleGroupe } from './menu-choix.utils';

const option = (id: string) => ({ produit: { _id: id, nom: id, disponible: true }, supplement: 0 });
const groupe = (_id: string, min: number, max: number, ids: string[]): GroupeMenu => ({
  _id,
  libelle: `Groupe ${_id}`,
  min,
  max,
  options: ids.map(option),
});

describe('règles des groupes de menu (US10, US11)', () => {
  it('formule la règle de choix', () => {
    expect(regleGroupe({ min: 1, max: 1 })).toBe('Choisissez 1');
    expect(regleGroupe({ min: 0, max: 2 })).toBe("Choisissez jusqu'à 2");
    expect(regleGroupe({ min: 2, max: 2 })).toBe('Choisissez 2');
    expect(regleGroupe({ min: 1, max: 3 })).toBe('Choisissez de 1 à 3');
  });

  it('un groupe à choix unique remplace l\'option précédente', () => {
    const g = groupe('g1', 1, 1, ['a', 'b']);
    const apresA = basculerOption(g, {}, 'a');
    expect(apresA['g1']).toEqual(['a']);
    expect(basculerOption(g, apresA, 'b')['g1']).toEqual(['b']);
  });

  it('un groupe à choix multiple s\'arrête au maximum et permet de décocher', () => {
    const g = groupe('g1', 0, 2, ['a', 'b', 'c']);
    let choix = basculerOption(g, {}, 'a');
    choix = basculerOption(g, choix, 'b');
    choix = basculerOption(g, choix, 'c'); // refusé : maximum atteint
    expect(choix['g1']).toEqual(['a', 'b']);
    expect(basculerOption(g, choix, 'a')['g1']).toEqual(['b']);
  });

  it('signale les groupes dont le minimum n\'est pas atteint', () => {
    const menu = { groupes: [groupe('g1', 1, 1, ['a', 'b']), groupe('g2', 0, 1, ['c'])] } as MenuDetail;
    expect(problemesChoix(menu, {})).toHaveLength(1);
    expect(problemesChoix(menu, {})[0]).toContain('Groupe g1');
    expect(problemesChoix(menu, { g1: ['a'] })).toEqual([]);
  });
});
