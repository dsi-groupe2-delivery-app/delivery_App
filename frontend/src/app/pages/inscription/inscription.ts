import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { FieldErrors, RegisterPayload } from '../../core/models';
import { passwordsMatch, strongPassword } from '../../core/password.validators';
import { BrandPanel } from '../../shared/brand-panel';
import { Icon } from '../../shared/icon';

/** US01 — Inscription (le visiteur coche Client ou Livreur). */
@Component({
  selector: 'app-inscription',
  imports: [ReactiveFormsModule, RouterLink, BrandPanel, Icon],
  templateUrl: './inscription.html',
})
export class Inscription {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.group(
    {
      role: this.fb.control<'client' | 'livreur' | null>(null, Validators.required),
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      telephone: ['', Validators.required],
      // travaille de sihem 
      // password: ['', [Validators.required, strongPassword]],
      // passwordConfirm: ['', Validators.required],
      //  je vais annuler required pour que le livreur peux envoyer demande d'inscrit (on vas les activer plus tard)
         password: [''],
   passwordConfirm: [''],
    }
  );

  readonly showPassword = signal(false);
  readonly submitted = signal(false);
  readonly sending = signal(false);
  /** Erreurs renvoyées par le serveur, affichées sous chaque champ. */
  readonly serverErrors = signal<FieldErrors>({});
  readonly globalError = signal('');
readonly successMessage = signal('');

  /** Message à afficher sous un champ : erreur serveur, sinon erreur locale. */
  error(field: string): string {
    const server = this.serverErrors()[field];
    if (server) return server;
    const c = this.form.get(field);
    if (!c || !(c.touched || this.submitted())) return '';
    if (field === 'role' && c.hasError('required')) return 'Veuillez choisir un rôle';
    if (c.hasError('required')) return 'Ce champ est obligatoire';
    if (c.hasError('email')) return "Format d'e-mail invalide";
    if (c.hasError('weakPassword')) return '8 caractères minimum, au moins 1 lettre et 1 chiffre';
    if (field === 'passwordConfirm' && this.form.hasError('passwordsMismatch')) {
      return 'Les mots de passe ne correspondent pas';
    }
    return '';
  }

  /** Une erreur serveur disparaît dès que l'utilisateur corrige le champ. */
  clearServerError(field: string) {
    if (this.serverErrors()[field]) {
      const { [field]: _, ...rest } = this.serverErrors();
      this.serverErrors.set(rest);
    }
  }
//cette methode pour activer les champs seloon le role
  onRoleChange(role: 'client' | 'livreur') {
  const password = this.form.controls.password;
  const passwordConfirm = this.form.controls.passwordConfirm;

  if (role === 'client') {
    // Le client doit choisir un mdp
    password.setValidators([Validators.required, strongPassword]);
    passwordConfirm.setValidators([Validators.required]);

    // Vérifier que les deux mots de passe correspondent.
    this.form.setValidators(passwordsMatch);
  } else {
    // Le livreur n'a pas besoin de mot de passe pour envoyer sa demande
    password.clearValidators();
    passwordConfirm.clearValidators();

    // La comparaison des mots de passe n'est plus nécessaire.
    this.form.clearValidators();

    password.setValue('');
    passwordConfirm.setValue('');
  }

  password.updateValueAndValidity();
  passwordConfirm.updateValueAndValidity();
  this.form.updateValueAndValidity();
}

  async submit() {
    this.submitted.set(true);
    this.globalError.set('');
    this.successMessage.set('');
    const role = this.form.controls.role.value;

if (role === 'client' || role === 'livreur') {
  this.onRoleChange(role);
}

    if (this.form.invalid) return;

    this.sending.set(true);
   // ce code creer directement un compte (client)
    // try {
    //   await this.auth.register(this.form.getRawValue() as RegisterPayload);
    //   await this.router.navigate(['/connexion'], {
    //     state: { message: 'Compte créé. Vous pouvez maintenant vous connecter.' },
    //   });
    // } 
    try {
  const values = this.form.getRawValue();

  if (values.role === 'client') {
    // Inscription normale du client
    await this.auth.register(values as RegisterPayload);

    await this.router.navigate(['/connexion'], {
      state: {
        message: 'Compte créé. Vous pouvez maintenant vous connecter.',
      },
    });

  } else if (values.role === 'livreur') {
    // Envoi de la demande d'inscription livreur
    await this.auth.submitDeliveryRequest({
      nom: values.nom!,
      prenom: values.prenom!,
      email: values.email!,
      telephone: values.telephone!,
    });

    this.successMessage.set(
      'Votre demande a été envoyée avec succès. Vous recevrez un e-mail après examen par notre équipe.'
    );
  }
}
    catch (err) {
      const e = err as HttpErrorResponse;
      if (e.error?.errors) this.serverErrors.set(e.error.errors);
      else this.globalError.set(e.error?.message ?? 'Une erreur est survenue, réessayez.');
      // Valeurs conservées, sauf les mots de passe (US01).
      this.form.patchValue({ password: '', passwordConfirm: '' });
    } finally {
      this.sending.set(false);
    }
  }
}
