import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Commande } from '../../core/commande.models';
import { CommandeService } from '../../core/commande.service';
import { messageErreur } from '../../core/erreurs';
import { Tnd } from '../../shared/tnd';

/** US15 : message de confirmation après un paiement accepté. */
@Component({
  selector: 'app-paiement-confirmation',
  imports: [RouterLink, Tnd],
  templateUrl: './paiement-confirmation.html',
  styleUrl: '../../shared/commande.css',
})
export class PaiementConfirmation implements OnInit {
  readonly numero = input.required<string>();

  private readonly commandes = inject(CommandeService);
  private readonly router = inject(Router);

  protected readonly commande = signal<Commande | null>(null);
  protected readonly erreur = signal('');
  /** La transaction acceptée (référence et 4 derniers chiffres de la carte). */
  protected readonly transaction = computed(() =>
    this.commande()?.transactions.find((t) => t.statut === 'acceptee')
  );

  async ngOnInit() {
    try {
      const commande = await this.commandes.lire(this.numero());
      // Pas encore payée : retour à la page de paiement.
      if (commande.statut === 'en_attente_paiement') {
        await this.router.navigate(['/paiement', commande.numero]);
        return;
      }
      this.commande.set(commande);
    } catch (err) {
      this.erreur.set(messageErreur(err));
    }
  }
}
