import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { CartService } from '../../core/cart.service';
import { messageErreur } from '../../core/erreurs';
import { Choix, MenuDetail } from '../../core/catalogue.models';
import { CatalogueService } from '../../core/catalogue.service';
import { MenuChoix } from '../../shared/menu-choix';
import { Tnd } from '../../shared/tnd';

/** US10 : détail d'un menu composé (groupes, règles, suppléments). US11 : ajout au panier. */
@Component({
  selector: 'app-menu-compose-detail',
  imports: [RouterLink, MenuChoix, Tnd],
  templateUrl: './menu-compose-detail.html',
  styleUrl: '../../shared/catalogue.css',
})
export class MenuComposeDetail implements OnInit {
  protected readonly catalogue = inject(CatalogueService);
  private readonly auth = inject(AuthService);
  private readonly cart = inject(CartService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly menu = signal<MenuDetail | null>(null);
  protected readonly chargement = signal(true);
  protected readonly introuvable = signal(false);
  protected readonly erreur = signal('');
  protected readonly erreurAjout = signal('');
  protected readonly message = signal('');
  protected readonly enCours = signal(false);

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
    this.introuvable.set(false);
    try {
      this.menu.set(await this.catalogue.menu(this.route.snapshot.paramMap.get('id') ?? ''));
    } catch (err) {
      if ((err as HttpErrorResponse).status === 404) this.introuvable.set(true);
      else this.erreur.set(messageErreur(err));
    } finally {
      this.chargement.set(false);
    }
  }

  protected async ajouter(valeur: { choix: Choix; quantite: number }) {
    const menu = this.menu();
    if (!menu) return;
    this.message.set('');
    this.erreurAjout.set('');

    // Visiteur : connexion d'abord, puis retour sur cette page.
    if (!this.auth.isLoggedIn()) {
      await this.router.navigate(['/connexion'], { queryParams: { retour: this.router.url } });
      return;
    }

    this.enCours.set(true);
    try {
      await this.cart.ajouterMenu(menu._id, valeur.choix, valeur.quantite);
      this.message.set(`« ${menu.nom} » a été ajouté au panier.`);
    } catch (err) {
      // Le serveur nomme le groupe concerné (minimum non atteint, maximum dépassé...).
      this.erreurAjout.set(messageErreur(err));
    } finally {
      this.enCours.set(false);
    }
  }
}
