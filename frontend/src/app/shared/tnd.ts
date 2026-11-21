import { Pipe, PipeTransform } from '@angular/core';

const FORMAT = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

/** Montant en dinars tunisiens, 3 décimales : 12.5 -> « 12,500 TND » ; avecPlus -> « +2,000 TND ». */
@Pipe({ name: 'tnd' })
export class Tnd implements PipeTransform {
  transform(valeur: number | null | undefined, avecPlus = false): string {
    if (valeur === null || valeur === undefined) return '';
    return `${avecPlus && valeur > 0 ? '+' : ''}${FORMAT.format(valeur)} TND`;
  }
}
