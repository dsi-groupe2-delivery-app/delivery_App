// US10 / US11 : règles d'un groupe d'options (min/max), en fonctions pures faciles à tester.
// Le serveur revérifie toujours : ces règles ne servent qu'à guider le client.
import { Choix, GroupeMenu, MenuDetail } from './catalogue.models';

/** Phrase affichée sous le nom du groupe : « Choisissez 1 », « Choisissez jusqu'à 2 »... */
export function regleGroupe(g: Pick<GroupeMenu, 'min' | 'max'>): string {
  if (g.min === g.max) return g.max === 1 ? 'Choisissez 1' : `Choisissez ${g.max}`;
  if (g.min === 0) return `Choisissez jusqu'à ${g.max}`;
  return `Choisissez de ${g.min} à ${g.max}`;
}

/** Coche ou décoche une option. Un groupe à choix unique (max = 1) remplace l'option précédente. */
export function basculerOption(g: GroupeMenu, choix: Choix, produitId: string): Choix {
  const actuel = choix[g._id] ?? [];
  let suivant: string[];
  if (actuel.includes(produitId)) suivant = actuel.filter((id) => id !== produitId);
  else if (g.max === 1) suivant = [produitId];
  else if (actuel.length < g.max) suivant = [...actuel, produitId];
  else suivant = actuel;
  return { ...choix, [g._id]: suivant };
}

/** Messages des groupes dont le minimum n'est pas atteint (ou le maximum dépassé). */
export function problemesChoix(menu: MenuDetail, choix: Choix): string[] {
  const problemes: string[] = [];
  for (const g of menu.groupes) {
    const n = (choix[g._id] ?? []).length;
    if (n < g.min) problemes.push(`« ${g.libelle} » : choisissez au moins ${g.min} option(s)`);
    if (n > g.max) problemes.push(`« ${g.libelle} » : choisissez au plus ${g.max} option(s)`);
  }
  return problemes;
}
