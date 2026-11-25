// US14 : une commande telle que l'API la renvoie (montants en TND, calculés par le serveur).

export type StatutCommande =
  | 'en_attente_paiement'
  | 'payee'
  | 'en_preparation'
  | 'prete'
  | 'en_livraison'
  | 'livree'
  | 'annulee';

export interface LigneCommande {
  type: 'produit' | 'menu';
  nom: string;
  quantite: number;
  prixUnitaire: number;
  totalLigne: number;
  /** Choix d'un menu composé : [{ libelle: 'Boisson', options: ["Jus d'orange"] }]. */
  choix: { libelle: string; options: string[] }[];
}

export interface Commande {
  _id: string;
  /** CMD-AAAAMMJJ-NNNN */
  numero: string;
  statut: StatutCommande;
  libelleStatut: string;
  lignes: LigneCommande[];
  nombreArticles: number;
  adresse: {
    libelle: string;
    rue: string;
    complement: string;
    ville: string;
    codePostal: string;
    telephone: string;
    instructions: string;
  };
  total: number;
  creeeLe: string;
}
