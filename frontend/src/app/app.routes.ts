import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/auth.guards';
import { Connexion } from './pages/connexion/connexion';
import { Inscription } from './pages/inscription/inscription';
import { MonEspace } from './pages/mon-espace/mon-espace';
import { Carte } from './pages/carte/carte';
import { MenusComposes } from './pages/menus-composes/menus-composes';
import { MenuComposeDetail } from './pages/menu-compose-detail/menu-compose-detail';
import { PanierPage } from './pages/panier/panier';
import { ChangerMotDePasse } from './pages/changer-mot-passe/changer-mot-passe';
import { Livraison } from './pages/livraison/livraison';
import { panierNonVideGuard } from './core/panier.guard';
import { Recapitulatif } from './pages/recapitulatif/recapitulatif';
import { Paiement } from './pages/paiement/paiement';
import { PaiementConfirmation } from './pages/paiement-confirmation/paiement-confirmation';
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
      // US11 : panier réservé au client connecté.
  { path: 'panier', component: PanierPage, canActivate: [authGuard, roleGuard('client')], title: 'Mon panier' },
  {
  path: 'changer-mot-de-passe',component:ChangerMotDePasse},
  // US13 : adresse de livraison (client connecté, panier non vide).
  { path: 'livraison', component: Livraison, canActivate: [authGuard, roleGuard('client'), panierNonVideGuard], title: 'Adresse de livraison' },
  // US14 : récapitulatif et validation du panier.
  { path: 'recapitulatif', component: Recapitulatif, canActivate: [authGuard, roleGuard('client')], title: 'Récapitulatif' },
  // US15 : paiement d'une commande validée, puis confirmation.
  { path: 'paiement/:numero', component: Paiement, canActivate: [authGuard, roleGuard('client')], title: 'Paiement' },
  {
    path: 'paiement/:numero/confirmation',
    component: PaiementConfirmation,
    canActivate: [authGuard, roleGuard('client')],
    title: 'Paiement accepté',
  },
  { path: '**', redirectTo: '' },

];
