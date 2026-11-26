import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { CartService } from './cart.service';
import { Commande } from './commande.models';

const API = `${environment.apiUrl}/api/commandes`;

/** US14 : appels à l'API des commandes du client connecté. */
@Injectable({ providedIn: 'root' })
export class CommandeService {
  private readonly http = inject(HttpClient);
  private readonly cart = inject(CartService);

  /**
   * US14 : valide le panier et crée la commande.
   * `cle` identifie cette validation : renvoyée deux fois, elle donne la même commande (double clic).
   */
  async validerPanier(cle: string): Promise<Commande> {
    const commande = await firstValueFrom(this.http.post<Commande>(API, { cle }));
    await this.cart.charger(); // le serveur a vidé le panier : l'en-tête repasse à 0
    return commande;
  }

  lire(numero: string): Promise<Commande> {
    return firstValueFrom(this.http.get<Commande>(`${API}/${encodeURIComponent(numero)}`));
  }
}
