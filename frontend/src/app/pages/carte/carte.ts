import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { messageErreur } from '../../core/erreurs';
import { Categorie, Produit } from '../../core/catalogue.models';
import { CatalogueService } from '../../core/catalogue.service';
import { Tnd } from '../../shared/tnd';

/** US10 : la carte (catégories et produits), en lecture seule. */
@Component({
  selector: 'app-carte',
  imports: [Tnd],
  templateUrl: './carte.html',
  styleUrl: '../../shared/catalogue.css',
})
export class Carte implements OnInit {
  protected readonly catalogue = inject(CatalogueService);

  protected readonly categories = signal<Categorie[]>([]);
  protected readonly produits = signal<Produit[]>([]);
  protected readonly filtre = signal<string | null>(null);
  protected readonly chargement = signal(true);
  protected readonly erreur = signal('');

  /** Catégories (déjà triées par le serveur) avec leurs produits, selon le filtre choisi. */
  protected readonly sections = computed(() => {
    const filtre = this.filtre();
    return this.categories()
      .filter((c) => !filtre || c._id === filtre)
      .map((categorie) => ({ categorie, produits: this.produits().filter((p) => p.categorie === categorie._id) }))
      .filter((s) => s.produits.length > 0);
  });

  ngOnInit() {
    void this.charger();
  }

  protected async charger() {
    this.chargement.set(true);
    this.erreur.set('');
    try {
      const [categories, produits] = await Promise.all([this.catalogue.categories(), this.catalogue.produits()]);
      this.categories.set(categories);
      this.produits.set(produits);
    } catch (err) {
      this.erreur.set(messageErreur(err));
    } finally {
      this.chargement.set(false);
    }
  }
}
