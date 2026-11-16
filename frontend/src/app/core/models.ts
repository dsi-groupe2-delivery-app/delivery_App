export type Role = 'client' | 'livreur' | 'admin';

export interface User {
  _id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  role: Role;
  actif: boolean;
}

export interface RegisterPayload {
  role: 'client' | 'livreur' | null;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  password: string;
  passwordConfirm: string;
}

/** Erreurs de validation renvoyées par l'API : { champ: message }. */
export type FieldErrors = Record<string, string>;
