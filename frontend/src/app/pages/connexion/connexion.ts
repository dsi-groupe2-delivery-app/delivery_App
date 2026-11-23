import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth.service';
import { BrandPanel } from '../../shared/brand-panel';
import { Icon } from '../../shared/icon';

/** US02 — Connexion : écran unique pour client, livreur et agent, sans choix de rôle. */
@Component({
  selector: 'app-connexion',
  imports: [ReactiveFormsModule, RouterLink, BrandPanel, Icon],
  templateUrl: './connexion.html',
})
export class Connexion {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  readonly showPassword = signal(false);
  readonly submitted = signal(false);
  readonly sending = signal(false);
  readonly errorMessage = signal('');
  /** Message de succès transmis par la page d'inscription. */
  readonly info = signal<string>(history.state?.message ?? '');

  error(field: 'email' | 'password'): string {
    const c = this.form.controls[field];
    if (!(c.touched || this.submitted())) return '';
    if (c.hasError('required')) return 'Ce champ est obligatoire';
    if (c.hasError('email')) return "Format d'e-mail invalide";
    return '';
  }

  async submit() {
    this.submitted.set(true);
    this.errorMessage.set('');
    if (this.form.invalid) return;

    this.sending.set(true);
    try {
      const { email, password } = this.form.getRawValue();
  
const redirect = await this.auth.login(email, password);

const user = this.auth.user();

// Première connexion du livreur
if (
  user?.role === 'livreur' &&
  user.doitChangerMotDePasse
) {
  await this.router.navigateByUrl('/changer-mot-de-passe');
  return;
}

// Back-Office admin
if (redirect.startsWith('/admin')) {
  window.location.href = environment.apiUrl + redirect;
  return;
}

// Connexion normale
const retour = this.route.snapshot.queryParamMap.get('retour');

await this.router.navigateByUrl(
  retour && retour.startsWith('/')
    ? retour
    : redirect
);
} catch (err) {
      const e = err as HttpErrorResponse;
      this.errorMessage.set(
        e.status === 0
          ? 'Serveur injoignable, réessayez plus tard.'
          : (e.error?.message ?? 'Identifiants incorrects')
      );
      this.form.controls.password.reset('');
    } finally {
      this.sending.set(false);
    }
  }
}
