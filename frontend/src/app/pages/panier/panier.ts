import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../../core/cart.service';
import { LignePanier } from '../../core/cart.models';
import { CatalogueService } from '../../core/catalogue.service';
import { Tnd } from '../../shared/tnd';

/** US11 : page du panier (lecture). US12 ajoutera la modification des lignes. */
@Component({
  selector: 'app-panier-page',
  imports: [RouterLink, Tnd],
  templateUrl: './panier.html',
  styleUrl: './panier.css',
})
export class PanierPage implements OnInit {
  protected readonly cart = inject(CartService);
  protected readonly catalogue = inject(CatalogueService);
  protected readonly chargement = signal(true);

  async ngOnInit() {
    await this.cart.charger();
    this.chargement.set(false);
  }

  /** « Frites, Coca » : noms des options choisies dans un groupe. */
  protected nomsOptions(groupe: LignePanier['choix'][number]): string {
    return groupe.options.map((o) => o.nom).join(', ');
  }
}
