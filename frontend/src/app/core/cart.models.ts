// US11 / US12 : le panier tel que le renvoie l'API. Tout est calculé par le serveur.
import { Choix } from './catalogue.models';
import { Adresse } from './adresse.models';
export interface AlerteLigne {
  type: 'indisponible' | 'prix_modifie';
  message: string;
}

export interface LignePanier {
  _id: string;
  type: 'produit' | 'menu';
  /** Identifiant du produit ou du menu composé. */
  refId: string;
  nom: string;
  image: string;
  quantite: number;
  /** Options choisies, groupe par groupe (menus composés). */
  choix: { groupeId: string; libelle: string; options: { produitId: string; nom: string }[] }[];
  /** Les mêmes choix, au format attendu par l'API pour une modification. */
  choixIds: Choix;
  prixUnitaire: number;
  totalLigne: number;
  disponible: boolean;
  alertes: AlerteLigne[];
}

export interface Panier {
  lignes: LignePanier[];
  nombreArticles: number;
  total: number;
  adresse?: Adresse;
}
