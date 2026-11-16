import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/auth.guards';
import { Connexion } from './pages/connexion/connexion';
import { Inscription } from './pages/inscription/inscription';
import { MonEspace } from './pages/mon-espace/mon-espace';

// Chaque story ajoute ses routes ici. Exemple pour une page réservée au livreur (US05) :
//   { path: 'livreur', component: ..., canActivate: [authGuard, roleGuard('livreur')] }
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'mon-espace' },
  { path: 'inscription', component: Inscription, canActivate: [guestGuard], title: 'Inscription' },
  { path: 'connexion', component: Connexion, canActivate: [guestGuard], title: 'Connexion' },
  {
    path: 'mon-espace',
    component: MonEspace,
    canActivate: [authGuard, roleGuard('client')],
    title: 'Mon espace',
  },
  { path: '**', redirectTo: '' },
];
