import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../core/cart.service';
import { LignePanier } from '../../core/cart.models';
import { CommandeService } from '../../core/commande.service';
import { messageErreur } from '../../core/erreurs';
import { Tnd } from '../../shared/tnd';

/**
 * US14 : récapitulatif du panier puis validation de la commande.
 * Tout est relu depuis le serveur (prix, disponibilité, total) ; le bouton crée la commande.
 */
@Component({
  selector: 'app-recapitulatif',
  imports: [RouterLink, Tnd],
  templateUrl: './recapitulatif.html',
  styleUrl: '../../shared/commande.css',
})
export class Recapitulatif implements OnInit {
  protected readonly cart = inject(CartService);
  private readonly commandes = inject(CommandeService);
  private readonly router = inject(Router);

  protected readonly chargement = signal(true);
  protected readonly enCours = signal(false);
  protected readonly erreur = signal('');
  /** Détails renvoyés par le serveur quand le panier a changé (un message par article). */
  protected readonly details = signal<string[]>([]);

  /** Clé de cette validation : un double clic renvoie la même commande au lieu d'en créer deux. */
  private readonly cle = crypto.randomUUID();

  protected readonly panier = this.cart.panier;
  protected readonly indisponibles = computed(() =>
    (this.panier()?.lignes ?? []).filter((l) => !l.disponible)
  );
  protected readonly prixModifies = computed(() =>
    (this.panier()?.lignes ?? []).filter((l) => l.disponible && l.alertes.some((a) => a.type === 'prix_modifie'))
  );
  /** Le bouton « Confirmer » n'est actif que si tout est en ordre. */
  protected readonly peutValider = computed(() => {
    const p = this.panier();
    return !!p && p.lignes.length > 0 && !!p.adresse && !this.indisponibles().length && !this.prixModifies().length;
  });

  async ngOnInit() {
    await this.cart.charger();
    this.chargement.set(false);
  }

  /** « Frites, Coca » : options choisies dans un groupe d'un menu. */
  protected options(groupe: LignePanier['choix'][number]): string {
    return groupe.options.map((o) => o.nom).join(', ');
  }

  /** Le client accepte les nouveaux prix : on les enregistre dans son panier (US12). */
  protected async accepterPrix() {
    this.erreur.set('');
    this.enCours.set(true);
    try {
      for (const l of this.prixModifies()) {
        await this.cart.modifierLigne(l._id, { quantite: l.quantite });
      }
      this.details.set([]);
    } catch (err) {
      this.erreur.set(messageErreur(err));
    } finally {
      this.enCours.set(false);
    }
  }

  protected async confirmer() {
    if (!this.peutValider() || this.enCours()) return;
    this.erreur.set('');
    this.details.set([]);
    this.enCours.set(true);
    try {
      const commande = await this.commandes.validerPanier(this.cle);
      // US14 : le client passe directement à l'étape du paiement.
      await this.router.navigate(['/paiement', commande.numero]);
    } catch (err) {
      const e = err as HttpErrorResponse;
      this.erreur.set(messageErreur(err));
      if (e.status === 409) {
        // Le panier a changé entre-temps : on affiche ce qui a bougé.
        this.details.set(e.error?.details ?? []);
        await this.cart.charger();
      }
    } finally {
      this.enCours.set(false);
    }
  }
}
