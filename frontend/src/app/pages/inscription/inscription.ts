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
      password: ['', [Validators.required, strongPassword]],
      passwordConfirm: ['', Validators.required],
    },
    { validators: passwordsMatch }
  );

  readonly showPassword = signal(false);
  readonly submitted = signal(false);
  readonly sending = signal(false);
  /** Erreurs renvoyées par le serveur, affichées sous chaque champ. */
  readonly serverErrors = signal<FieldErrors>({});
  readonly globalError = signal('');

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

  async submit() {
    this.submitted.set(true);
    this.globalError.set('');
    if (this.form.invalid) return;

    this.sending.set(true);
    try {
      await this.auth.register(this.form.getRawValue() as RegisterPayload);
      await this.router.navigate(['/connexion'], {
        state: { message: 'Compte créé. Vous pouvez maintenant vous connecter.' },
      });
    } catch (err) {
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
