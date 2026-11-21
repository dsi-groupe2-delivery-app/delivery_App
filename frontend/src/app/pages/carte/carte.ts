import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { CartService } from '../../core/cart.service';
import { messageErreur } from '../../core/erreurs';
import { Categorie, Produit } from '../../core/catalogue.models';
import { CatalogueService } from '../../core/catalogue.service';
import { Tnd } from '../../shared/tnd';

/** US10 : la carte (catégories et produits). US11 : bouton « Ajouter » au panier. */
@Component({
  selector: 'app-carte',
  imports: [RouterLink, Tnd],
  templateUrl: './carte.html',
  styleUrl: '../../shared/catalogue.css',
})
export class Carte implements OnInit {
  protected readonly catalogue = inject(CatalogueService);
  private readonly auth = inject(AuthService);
  private readonly cart = inject(CartService);
  private readonly router = inject(Router);

  protected readonly categories = signal<Categorie[]>([]);
  protected readonly produits = signal<Produit[]>([]);
  protected readonly filtre = signal<string | null>(null);
  protected readonly chargement = signal(true);
  protected readonly erreur = signal('');
  protected readonly message = signal('');
  protected readonly erreurAjout = signal('');
  /** Identifiant du produit en cours d'ajout (évite le double clic). */
  protected readonly enCours = signal<string | null>(null);

  /** Catégories (déjà triées par le serveur) avec leurs produits, selon le filtre choisi. */
  protected readonly sections = computed(() => {
    const filtre = this.filtre();
    return this.categories()
      .filter((c) => !filtre || c._id === filtre)
      .map((categorie) => ({ categorie, produits: this.produits().filter((p) => p.categorie === categorie._id) }))
      .filter((s) => s.produits.length > 0);
  });

  /** Le visiteur est invité à se connecter ; livreur et agent ne commandent pas. */
  protected readonly peutCommander = computed(() => {
    const user = this.auth.user();
    return !user || user.role === 'client';
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

  protected async ajouter(produit: Produit, quantite: number) {
    this.message.set('');
    this.erreurAjout.set('');

    // Visiteur : connexion d'abord, puis retour sur cette page (paramètre « retour » de /connexion).
    if (!this.auth.isLoggedIn()) {
      await this.router.navigate(['/connexion'], { queryParams: { retour: this.router.url } });
      return;
    }
    if (!Number.isInteger(quantite) || quantite < 1 || quantite > 20) {
      this.erreurAjout.set('La quantité doit être un entier de 1 à 20.');
      return;
    }

    this.enCours.set(produit._id);
    try {
      await this.cart.ajouterProduit(produit._id, quantite);
      this.message.set(`« ${produit.nom} » a été ajouté au panier.`);
    } catch (err) {
      this.erreurAjout.set(messageErreur(err));
    } finally {
      this.enCours.set(null);
    }
  }
}
