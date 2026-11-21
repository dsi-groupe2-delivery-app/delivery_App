import { HttpErrorResponse } from '@angular/common/http';

/** Message lisible pour une erreur de l'API (le serveur renvoie { message }). */
export function messageErreur(err: unknown): string {
  const e = err as HttpErrorResponse;
  if (e?.status === 0) return 'Serveur injoignable, réessayez plus tard.';
  if (e?.status === 401) return 'Votre session a expiré, reconnectez-vous.';
  return e?.error?.message ?? 'Une erreur est survenue, réessayez.';
}
