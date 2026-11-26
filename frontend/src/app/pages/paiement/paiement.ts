import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Commande, MoyenPaiement } from '../../core/commande.models';
import { CommandeService } from '../../core/commande.service';
import { messageErreur } from '../../core/erreurs';
import { FieldErrors } from '../../core/models';
import { Tnd } from '../../shared/tnd';

/** 16 chiffres (espaces acceptés). Le contrôle complet (Luhn, carte refusée) est fait par le serveur. */
const CARTE = /^(\s*\d){16}\s*$/;

/** US15 : paiement en ligne (simulé) d'une commande « En attente de paiement ». */
@Component({
  selector: 'app-paiement',
  imports: [ReactiveFormsModule, RouterLink, Tnd],
  templateUrl: './paiement.html',
  styleUrls: ['../../shared/commande.css', './paiement.css'],
})
export class Paiement implements OnInit {
  /** Numéro de commande, lu dans l'URL /paiement/:numero. */
  readonly numero = input.required<string>();

  private readonly fb = inject(FormBuilder);
  private readonly commandes = inject(CommandeService);
  private readonly router = inject(Router);

  protected readonly commande = signal<Commande | null>(null);
  protected readonly moyens = signal<MoyenPaiement[]>([]);
  protected readonly chargement = signal(true);
  protected readonly enCours = signal(false);
  protected readonly envoye = signal(false);
  protected readonly erreur = signal('');
  protected readonly erreursServeur = signal<FieldErrors>({});
  protected readonly confirmerAnnulation = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    moyen: ['carte_bancaire', Validators.required],
    titulaire: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],
    numeroCarte: ['', [Validators.required, Validators.pattern(CARTE)]],
    expiration: ['', [Validators.required, Validators.pattern(/^\d{2}\/\d{2}$/)]],
    cvv: ['', [Validators.required, Validators.pattern(/^\d{3}$/)]],
  });

  async ngOnInit() {
    try {
      const [commande, moyens] = await Promise.all([
        this.commandes.lire(this.numero()),
        this.commandes.moyensPaiement(),
      ]);
      // Déjà payée : on montre directement la confirmation (pas de second paiement).
      if (commande.statut === 'payee') {
        await this.router.navigate(['/paiement', commande.numero, 'confirmation']);
        return;
      }
      this.commande.set(commande);
      this.moyens.set(moyens);
    } catch (err) {
      this.erreur.set(messageErreur(err));
    } finally {
      this.chargement.set(false);
    }
  }

  protected erreurChamp(champ: string): string {
    const serveur = this.erreursServeur()[champ];
    if (serveur) return serveur;
    const c = this.form.get(champ);
    if (!c || c.valid || !(c.touched || this.envoye())) return '';
    if (c.hasError('required')) return 'Ce champ est obligatoire';
    if (champ === 'titulaire') return 'Entre 2 et 60 caractères';
    if (champ === 'numeroCarte') return 'Numéro de carte invalide (16 chiffres)';
    if (champ === 'expiration') return 'Format MM/AA attendu';
    if (champ === 'cvv') return '3 chiffres au dos de la carte';
    return '';
  }

  protected effacerErreur(champ: string) {
    if (!this.erreursServeur()[champ]) return;
    const erreurs = Object.assign({}, this.erreursServeur());
    delete erreurs[champ];
    this.erreursServeur.set(erreurs);
  }

  /** « 4242424242424242 » -> « 4242 4242 4242 4242 » pendant la saisie. */
  protected formaterCarte() {
    const c = this.form.controls.numeroCarte;
    const chiffres = c.value.replace(/\D/g, '').slice(0, 16);
    c.setValue(chiffres.replace(/(\d{4})(?=\d)/g, '$1 '), { emitEvent: false });
    this.effacerErreur('numeroCarte');
  }

  /** « 1230 » -> « 12/30 » pendant la saisie. */
  protected formaterExpiration() {
    const c = this.form.controls.expiration;
    const chiffres = c.value.replace(/\D/g, '').slice(0, 4);
    c.setValue(chiffres.length > 2 ? `${chiffres.slice(0, 2)}/${chiffres.slice(2)}` : chiffres, { emitEvent: false });
    this.effacerErreur('expiration');
  }

  protected async payer() {
    this.envoye.set(true);
    this.erreur.set('');
    if (this.form.invalid || this.enCours()) return;

    this.enCours.set(true);
    try {
      const commande = await this.commandes.payer(this.numero(), this.form.getRawValue());
      await this.router.navigate(['/paiement', commande.numero, 'confirmation']);
    } catch (err) {
      const e = err as HttpErrorResponse;
      if (e.status === 400 && e.error?.errors) this.erreursServeur.set(e.error.errors);
      else this.erreur.set(messageErreur(err));
      // Paiement refusé : on efface le CVV (sans afficher « obligatoire » tout de suite),
      // le client corrige ou change de carte.
      this.form.controls.cvv.reset('');
      this.envoye.set(false);
      if (e.status === 409) this.commande.set(await this.commandes.lire(this.numero()));
    } finally {
      this.enCours.set(false);
    }
  }

  protected async annuler() {
    this.erreur.set('');
    this.enCours.set(true);
    try {
      this.commande.set(await this.commandes.annuler(this.numero()));
      this.confirmerAnnulation.set(false);
    } catch (err) {
      this.erreur.set(messageErreur(err));
    } finally {
      this.enCours.set(false);
    }
  }
}
