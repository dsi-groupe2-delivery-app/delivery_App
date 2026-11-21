import { HttpClient } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { Choix } from './catalogue.models';
import { Panier } from './cart.models';

const API = `${environment.apiUrl}/api/panier`;

/**
 * US11 / US12 : état du panier partagé par toute l'application.
 * L'en-tête lit `nombreArticles()` et `total()` ; les pages appellent les méthodes ci-dessous.
 * Le serveur calcule tout : on affiche simplement ce qu'il renvoie.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private readonly _panier = signal<Panier | null>(null);
  readonly panier = this._panier.asReadonly();
  readonly nombreArticles = computed(() => this._panier()?.nombreArticles ?? 0);
  readonly total = computed(() => this._panier()?.total ?? 0);

  constructor() {
    // Un client se connecte : on charge son panier. Déconnexion ou autre rôle : on l'oublie.
    effect(() => {
      const user = this.auth.user();
      if (user?.role === 'client') untracked(() => void this.charger());
      else this._panier.set(null);
    });
  }

  async charger(): Promise<void> {
    try {
      this._panier.set(await firstValueFrom(this.http.get<Panier>(API)));
    } catch {
      this._panier.set(null);
    }
  }

  ajouterProduit(produitId: string, quantite = 1) {
    return this.envoyer(this.http.post<Panier>(`${API}/lignes`, { type: 'produit', produitId, quantite }));
  }

  ajouterMenu(menuId: string, choix: Choix, quantite = 1) {
    return this.envoyer(this.http.post<Panier>(`${API}/lignes`, { type: 'menu', menuId, choix, quantite }));
  }

  /** quantite 0 supprime la ligne. */
  modifierLigne(ligneId: string, changements: { quantite?: number; choix?: Choix }) {
    return this.envoyer(this.http.patch<Panier>(`${API}/lignes/${ligneId}`, changements));
  }

  supprimerLigne(ligneId: string) {
    return this.envoyer(this.http.delete<Panier>(`${API}/lignes/${ligneId}`));
  }

  vider() {
    return this.envoyer(this.http.delete<Panier>(API));
  }

  private async envoyer(requete: Observable<Panier>): Promise<Panier> {
    const panier = await firstValueFrom(requete);
    this._panier.set(panier);
    return panier;
  }
}
