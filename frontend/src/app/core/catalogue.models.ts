// US10 : modèles renvoyés par l'API publique de la carte. Les prix sont en TND.

export interface Categorie {
    _id: string;
    nom: string;
    ordre: number;
  }
  
  export interface Produit {
    _id: string;
    nom: string;
    description: string;
    prix: number;
    /** Chemin sur l'API (ex. /uploads/x.jpg) : utiliser CatalogueService.imageUrl(). */
    image: string;
    disponible: boolean;
    categorie: string;
  }
  
  export interface MenuResume {
    _id: string;
    nom: string;
    description: string;
    image: string;
    /** Prix de base : « à partir de X TND ». */
    prixBase: number;
    /** Disponibilité effective (désactivé, ou un groupe n'atteint plus son minimum). */
    disponible: boolean;
    raison: string | null;
  }
  
  export interface OptionMenu {
    produit: { _id: string | null; nom: string; disponible: boolean };
    supplement: number;
  }
  
  export interface GroupeMenu {
    _id: string;
    libelle: string;
    min: number;
    max: number;
    options: OptionMenu[];
  }
  
  export interface MenuDetail extends MenuResume {
    groupes: GroupeMenu[];
  }
  
  /** Choix d'un menu : { identifiant du groupe: [identifiants des produits choisis] }. */
  export type Choix = Record<string, string[]>;
  