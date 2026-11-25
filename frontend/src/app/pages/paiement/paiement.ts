import { Component, OnInit, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Commande } from '../../core/commande.models';
import { CommandeService } from '../../core/commande.service';
import { messageErreur } from '../../core/erreurs';
import { Tnd } from '../../shared/tnd';

/**
 * Étape du paiement, où arrive le client après la validation du panier (US14).
 * Affiche la commande enregistrée « En attente de paiement » ; le formulaire de paiement arrive avec US15.
 */
@Component({
  selector: 'app-paiement',
  imports: [RouterLink, Tnd],
  templateUrl: './paiement.html',
  styleUrl: '../../shared/commande.css',
})
export class Paiement implements OnInit {
  /** Numéro de commande, lu dans l'URL /paiement/:numero. */
  readonly numero = input.required<string>();

  private readonly commandes = inject(CommandeService);

  protected readonly commande = signal<Commande | null>(null);
  protected readonly chargement = signal(true);
  protected readonly erreur = signal('');

  async ngOnInit() {
    try {
      this.commande.set(await this.commandes.lire(this.numero()));
    } catch (err) {
      this.erreur.set(messageErreur(err));
    } finally {
      this.chargement.set(false);
    }
  }
}
