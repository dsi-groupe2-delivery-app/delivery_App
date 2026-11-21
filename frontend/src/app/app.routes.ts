import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/auth.guards';
import { Connexion } from './pages/connexion/connexion';
import { Inscription } from './pages/inscription/inscription';
import { MonEspace } from './pages/mon-espace/mon-espace';
import { Carte } from './pages/carte/carte';
import { MenusComposes } from './pages/menus-composes/menus-composes';
import { MenuComposeDetail } from './pages/menu-compose-detail/menu-compose-detail';
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
    // US10 : carte et menus composés, publics (sans connexion).
    { path: 'carte', component: Carte, title: 'Carte' },
    { path: 'menus-composes', component: MenusComposes, title: 'Menus composés' },
    { path: 'menus-composes/:id', component: MenuComposeDetail, title: 'Menu composé' },
  { path: '**', redirectTo: '' },
];
