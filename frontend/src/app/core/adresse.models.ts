// US13 : adresses de livraison, telles que l'API les renvoie et les reçoit.

/** Adresse renvoyée par l'API. */
export interface Adresse {
    _id: string;
    libelle: string;
    rue: string;
    complement: string;
    ville: string;
    codePostal: string;
    telephone: string;
    instructions: string;
    
    enregistree: boolean;
  }
  
  /** Données envoyées à POST /api/adresses. */
  export interface NouvelleAdresse {
    libelle: string;
    rue: string;
    complement: string;
    ville: string;
    codePostal: string;
    telephone: string;
    instructions: string;
    /** Case « Enregistrer dans mon profil ». */
    enregistrer: boolean;
  }