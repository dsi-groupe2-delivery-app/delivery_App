import { Tnd } from './tnd';

describe('Tnd', () => {
  const pipe = new Tnd();

  it('affiche 3 décimales et la devise', () => {
    expect(pipe.transform(12.5)).toBe('12,500 TND');
    expect(pipe.transform(0)).toBe('0,000 TND');
  });

  it('ajoute le signe + pour un supplément', () => {
    expect(pipe.transform(2, true)).toBe('+2,000 TND');
    expect(pipe.transform(0, true)).toBe('0,000 TND');
  });

  it('renvoie une chaîne vide sans valeur', () => {
    expect(pipe.transform(null)).toBe('');
  });
});
