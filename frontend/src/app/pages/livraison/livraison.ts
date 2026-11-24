import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Adresse } from '../../core/adresse.models';
import { AdresseService } from '../../core/adresse.service';
import { CartService } from '../../core/cart.service';
import { messageErreur } from '../../core/erreurs';
import { FieldErrors } from '../../core/models';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
/** US13 : saisir ou choisir l'adresse de livraison du panier. */
@Component({
  selector: 'app-livraison',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './livraison.html',
  styleUrl: './livraison.css',
})
export class Livraison implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly adresseService = inject(AdresseService);
  private readonly cart = inject(CartService);
  private readonly auth = inject(AuthService);
  /** Adresses enregistrées dans le profil du client. */
  protected readonly adresses = signal<Adresse[]>([]);
  /** Adresse choisie : l'id d'une adresse enregistrée, ou 'nouvelle'. */
  protected readonly choix = signal('nouvelle');

  protected readonly envoye = signal(false);
  protected readonly enCours = signal(false);
  protected readonly erreur = signal('');
  protected readonly succes = signal('');
  /** Erreurs renvoyées par le serveur, affichées sous chaque champ. */
  protected readonly erreursServeur = signal<FieldErrors>({});

  /** Dernière nouvelle adresse créée : réutilisée si le formulaire n'a pas changé (pas de doublon). */
  private derniereAdresseId: string | null = null;

  // Mêmes règles que le serveur (validators/adresse.js).
  protected readonly form = this.fb.nonNullable.group({
    libelle: ['', Validators.maxLength(50)],
    // Au moins un chiffre (le numéro) et une lettre (le nom de la rue).
    rue: ['', [Validators.required, Validators.maxLength(150), Validators.pattern(/^(?=.*\d)(?=.*\p{L}).*$/u)]],
    complement: ['', Validators.maxLength(150)],
    ville: ['', [Validators.required, Validators.maxLength(80)]],
    codePostal: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]],
    // 8 chiffres, espaces autorisés (« 22 000 000 »).
    telephone: ['', [Validators.required, Validators.pattern(/^(\s*\d){8}\s*$/)]],
    instructions: ['', Validators.maxLength(200)],
    enregistrer: [true],
  });

  async ngOnInit() {
    try {
      this.adresses.set(await this.adresseService.lister());
    } catch (err) {
      this.erreur.set(messageErreur(err));
    }

    // Téléphone du profil proposé par défaut (le client peut en saisir un autre).
    const telephoneProfil = this.auth.user()?.telephone;
    if (telephoneProfil) this.form.controls.telephone.setValue(telephoneProfil);

    // Une adresse est déjà choisie pour ce panier : on la réaffiche.
    await this.cart.charger();
    const actuelle = this.cart.panier()?.adresse;
    if (!actuelle) return;
    if (this.adresses().some((a) => a._id === actuelle._id)) {
      this.choix.set(actuelle._id);
    } else {
      this.form.patchValue(actuelle);
      this.form.controls.enregistrer.setValue(false);
      this.form.markAsPristine();
      this.derniereAdresseId = actuelle._id;
    }
  }

  /** Message sous un champ : erreur du serveur, sinon erreur du formulaire. */
  protected erreurChamp(champ: string): string {
    const serveur = this.erreursServeur()[champ];
    if (serveur) return serveur;
    const controle = this.form.get(champ);
    if (!controle || !(controle.touched || this.envoye())) return '';
    if (controle.hasError('required')) return 'Ce champ est obligatoire';
    if (champ === 'rue' && controle.hasError('pattern')) return 'Indiquez le numéro et le nom de la rue';
    if (champ === 'codePostal' && controle.hasError('pattern')) return '4 chiffres attendus';
    if (champ === 'telephone' && controle.hasError('pattern')) return '8 chiffres attendus';
    if (controle.hasError('maxlength')) {
      return `${controle.getError('maxlength').requiredLength} caractères maximum`;
    }
    return '';
  }

  /** L'erreur du serveur disparaît dès que le client corrige le champ. */
  protected effacerErreur(champ: string) {
    if (!this.erreursServeur()[champ]) return;
    const erreurs = Object.assign({}, this.erreursServeur());
    delete erreurs[champ];
    this.erreursServeur.set(erreurs);
  }

  /** Bouton « Continuer » : crée l'adresse si besoin, puis l'associe au panier. */
  protected async continuer() {
    this.envoye.set(true);
    this.erreur.set('');
    this.succes.set('');
    if (this.choix() === 'nouvelle' && this.form.invalid) return;

    this.enCours.set(true);
    try {
      const adresseId = this.choix() === 'nouvelle' ? await this.nouvelleAdresseId() : this.choix();
      await this.cart.choisirAdresse(adresseId);
      this.succes.set('Adresse de livraison enregistrée pour votre commande.');
    } catch (err) {
      const e = err as HttpErrorResponse;
      // 400 avec une erreur par champ : affichée sous le champ, la saisie est conservée.
      if (e.status === 400 && e.error?.errors) this.erreursServeur.set(e.error.errors);
      else this.erreur.set(messageErreur(err));
    } finally {
      this.enCours.set(false);
    }
  }

  /** Crée la nouvelle adresse, sauf si elle vient déjà d'être créée sans modification. */
  private async nouvelleAdresseId(): Promise<string> {
    if (this.derniereAdresseId && this.form.pristine) return this.derniereAdresseId;

    const adresse = await this.adresseService.creer(this.form.getRawValue());
    this.derniereAdresseId = adresse._id;
    this.form.markAsPristine();

    // Enregistrée dans le profil : ajoutée en haut de la liste et sélectionnée.
    if (adresse.enregistree) {
      this.adresses.set([adresse].concat(this.adresses()));
      this.choix.set(adresse._id);
    }
    return adresse._id;
  }
}