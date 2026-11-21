import { Component, computed, input, linkedSignal, output } from '@angular/core';
import { Choix, GroupeMenu, MenuDetail } from '../core/catalogue.models';
import { basculerOption, problemesChoix, regleGroupe } from '../core/menu-choix.utils';
import { Tnd } from './tnd';

/**
 * Écran de choix d'un menu composé : un bloc par groupe, avec sa règle (min/max) et ses options.
 * Réutilisé par le détail d'un menu (US11, ajout) et par le panier (US12, modification).
 */
@Component({
  selector: 'app-menu-choix',
  imports: [Tnd],
  templateUrl: './menu-choix.html',
  styleUrl: './menu-choix.css',
})
export class MenuChoix {
  readonly menu = input.required<MenuDetail>();
  /** Choix déjà faits (modification d'une ligne du panier). */
  readonly valeurInitiale = input<Choix>({});
  readonly quantiteInitiale = input(1);
  /** false = consultation seule (visiteur sans droit de commander) : ni bouton ni quantité. */
  readonly commandable = input(true);
  readonly avecQuantite = input(true);
  readonly libelleBouton = input('Ajouter au panier');
  readonly avecAnnuler = input(false);
  readonly enCours = input(false);
  /** Message d'erreur renvoyé par le serveur. */
  readonly erreur = input('');

  readonly valider = output<{ choix: Choix; quantite: number }>();
  readonly annuler = output<void>();

  protected readonly selection = linkedSignal<Choix>(() => ({ ...this.valeurInitiale() }));
  protected readonly quantite = linkedSignal(() => this.quantiteInitiale());

  protected readonly problemes = computed(() => problemesChoix(this.menu(), this.selection()));
  protected readonly quantiteValide = computed(
    () => Number.isInteger(this.quantite()) && this.quantite() >= 1 && this.quantite() <= 20
  );

  protected regle(g: GroupeMenu) {
    return regleGroupe(g);
  }

  protected estChoisie(g: GroupeMenu, produitId: string | null) {
    return produitId !== null && (this.selection()[g._id] ?? []).includes(produitId);
  }

  protected basculer(g: GroupeMenu, produitId: string | null) {
    if (!this.commandable() || produitId === null) return;
    this.selection.update((choix) => basculerOption(g, choix, produitId));
  }

  protected envoyer() {
    if (this.problemes().length > 0 || !this.quantiteValide()) return;
    this.valider.emit({ choix: this.selection(), quantite: this.avecQuantite() ? this.quantite() : 1 });
  }
}
