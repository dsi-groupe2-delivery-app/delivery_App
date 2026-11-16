import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Role } from './models';

/** Page réservée aux utilisateurs connectés ; sinon redirection vers /connexion. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  if (auth.isLoggedIn()) return true;
  return inject(Router).createUrlTree(['/connexion'], {
    queryParams: { retour: state.url },
  });
};

/**
 * Page réservée à certains rôles. À utiliser après authGuard :
 *   { path: 'livreur', canActivate: [authGuard, roleGuard('livreur')], ... }
 * Un utilisateur connecté avec un autre rôle est renvoyé vers sa propre page d'accueil.
 */
export function roleGuard(...roles: Role[]): CanActivateFn {
  return () => {
    const user = inject(AuthService).user();
    if (user && roles.includes(user.role)) return true;
    const router = inject(Router);
    if (!user) return router.createUrlTree(['/connexion']);
    return router.createUrlTree([user.role === 'livreur' ? '/livreur' : '/mon-espace']);
  };
}

/** Pages /connexion et /inscription : inutiles si l'on est déjà connecté. */
export const guestGuard: CanActivateFn = () => {
  const user = inject(AuthService).user();
  if (!user) return true;
  return inject(Router).createUrlTree([user.role === 'livreur' ? '/livreur' : '/mon-espace']);
};
