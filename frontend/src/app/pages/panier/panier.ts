import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../../core/cart.service';
import { messageErreur } from '../../core/erreurs';
import { LignePanier } from '../../core/cart.models';
import { Choix, MenuDetail } from '../../core/catalogue.models';
import { CatalogueService } from '../../core/catalogue.service';
import { MenuChoix } from '../../shared/menu-choix';
import { Tnd } from '../../shared/tnd';

/** US12 : page du panier (quantités, suppression, vidage, modification des choix d'un menu). */
@Component({
  selector: 'app-panier-page',
  imports: [RouterLink, MenuChoix, Tnd],
  templateUrl: './panier.html',
  styleUrl: './panier.css',
})
export class PanierPage implements OnInit {
  protected readonly cart = inject(CartService);
  protected readonly catalogue = inject(CatalogueService);

  protected readonly chargement = signal(true);
  protected readonly erreur = signal('');
  protected readonly enCours = signal(false);
  protected readonly confirmerVidage = signal(false);
  /** Menu en cours de modification depuis une ligne du panier. */
  protected readonly edition = signal<{ ligne: LignePanier; menu: MenuDetail } | null>(null);
  protected readonly erreurEdition = signal('');

  async ngOnInit() {
    await this.cart.charger();
    this.chargement.set(false);
  }

  /** « Frites, Coca » : noms des options choisies dans un groupe. */
  protected nomsOptions(groupe: LignePanier['choix'][number]): string {
    return groupe.options.map((o) => o.nom).join(', ');
  }

  /** Exécute une action du panier en gardant le message d'erreur du serveur. */
  private async agir(action: () => Promise<unknown>): Promise<boolean> {
    this.erreur.set('');
    this.enCours.set(true);
    try {
      await action();
      return true;
    } catch (err) {
      this.erreur.set(messageErreur(err));
      return false;
    } finally {
      this.enCours.set(false);
    }
  }

  /** Boutons + et − : une quantité qui tombe à 0 supprime la ligne. */
  protected changerQuantite(ligne: LignePanier, delta: number) {
    const quantite = ligne.quantite + delta;
    if (quantite > 20) {
      this.erreur.set('La quantité maximale est de 20 par ligne.');
      return;
    }
    void this.agir(() => this.cart.modifierLigne(ligne._id, { quantite }));
  }

  /** Saisie directe dans le champ quantité : entier de 0 à 20 (0 supprime la ligne). */
  protected saisirQuantite(ligne: LignePanier, valeur: number) {
    if (!Number.isInteger(valeur) || valeur < 0 || valeur > 20) {
      this.erreur.set('La quantité doit être un entier de 1 à 20 (0 supprime la ligne).');
      return;
    }
    void this.agir(() => this.cart.modifierLigne(ligne._id, { quantite: valeur }));
  }

  protected supprimer(ligne: LignePanier) {
    void this.agir(() => this.cart.supprimerLigne(ligne._id));
  }

  protected async vider() {
    if (await this.agir(() => this.cart.vider())) this.confirmerVidage.set(false);
  }

  /** Rouvre l'écran de choix de US10 avec les choix déjà faits. */
  protected async modifierMenu(ligne: LignePanier) {
    this.erreurEdition.set('');
    if (!(await this.agir(async () => this.edition.set({ ligne, menu: await this.catalogue.menu(ligne.refId) })))) {
      this.edition.set(null);
    }
  }

  protected async enregistrerChoix(choix: Choix) {
    const edition = this.edition();
    if (!edition) return;
    this.erreurEdition.set('');
    this.enCours.set(true);
    try {
      await this.cart.modifierLigne(edition.ligne._id, { choix });
      this.edition.set(null);
    } catch (err) {
      // Mêmes règles min/max qu'à l'ajout : le message nomme le groupe concerné.
      this.erreurEdition.set(messageErreur(err));
    } finally {
      this.enCours.set(false);
    }
  }
}
