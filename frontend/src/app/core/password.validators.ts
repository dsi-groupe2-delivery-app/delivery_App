import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Au moins 8 caractères, une lettre et un chiffre (mêmes règles que le serveur). */
export const strongPassword: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const v: string = control.value ?? '';
  if (!v) return null; // "required" s'en charge
  const ok = v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v);
  return ok ? null : { weakPassword: true };
};

/** La confirmation doit être identique au mot de passe (validateur de groupe). */
export const passwordsMatch: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const password = group.get('password')?.value;
  const confirm = group.get('passwordConfirm')?.value;
  if (!confirm) return null;
  return password === confirm ? null : { passwordsMismatch: true };
};
