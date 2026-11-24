import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CartService } from './cart.service';

/** US13 : page réservée à un panier non vide ; sinon, redirection vers la carte. */
export const panierNonVideGuard: CanActivateFn = async () => {
  const cart = inject(CartService);
  const router = inject(Router);
  await cart.charger();
  return cart.nombreArticles() > 0 ? true : router.createUrlTree(['/carte']);
};