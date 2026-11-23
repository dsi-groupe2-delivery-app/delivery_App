
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { BrandPanel } from '../../shared/brand-panel';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../core/auth.service';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'app-changer-mot-de-passe',
  standalone: true,
  imports: [ReactiveFormsModule, Icon,BrandPanel],
  templateUrl: './changer-mot-passe.html'
})
export class ChangerMotDePasse {

  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly showPassword = signal(false);
  readonly showConfirmation = signal(false);

  readonly submitted = signal(false);
  readonly sending = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly form = this.fb.nonNullable.group({
    newPassword: ['', [
      Validators.required,
      Validators.minLength(8)
    ]],

    confirmPassword: ['', [
      Validators.required
    ]]
  });

  error(field: 'newPassword' | 'confirmPassword'): string {
    const control = this.form.controls[field];

    if (!(control.touched || this.submitted())) {
      return '';
    }

    if (control.hasError('required')) {
      return 'Ce champ est obligatoire.';
    }

    if (control.hasError('minlength')) {
      return 'Minimum 8 caractères.';
    }

    if (
      field === 'confirmPassword' &&
      control.value !== this.form.controls.newPassword.value
    ) {
      return 'Les mots de passe ne correspondent pas.';
    }

    return '';
  }

  async submit() {
    this.submitted.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.form.invalid) return;

    const { newPassword, confirmPassword } =
      this.form.getRawValue();

    if (newPassword !== confirmPassword) {
      this.errorMessage.set(
        'Les mots de passe ne correspondent pas.'
      );
      return;
    }

    this.sending.set(true);

    try {
      const res = await this.auth.changePassword(
        newPassword,
        confirmPassword
      );

      this.successMessage.set(res.message);

      // L'utilisateur peut maintenant accéder à son espace.
      await this.router.navigateByUrl('/livreur');

    } catch (err) {
      const e = err as HttpErrorResponse;

      this.errorMessage.set(
        e.error?.message ??
        'Une erreur est survenue. Réessayez.'
      );

    } finally {
      this.sending.set(false);
    }
  }
}
