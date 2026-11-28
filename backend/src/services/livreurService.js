// US24 : règles métier de la gestion des livreurs par l'agent.
const repo = require("../repositories/livreurRepository");

const comparer = (a, b) => a.localeCompare(b, "fr", { sensitivity: "base" });

// Liste des livreurs, triée par nom puis prénom.
async function listerLivreurs() {
  const livreurs = await repo.lister();
  return livreurs
    .map((l) => ({
      _id: l._id,
      nom: l.nom,
      prenom: l.prenom,
      email: l.email,
      telephone: l.telephone,
      actif: l.actif,
    }))
    .sort((a, b) => comparer(a.nom, b.nom) || comparer(a.prenom, b.prenom));
}

// Valeurs actuelles d'un livreur pour pré-remplir le formulaire, ou null s'il n'existe pas.
async function valeursLivreur(id) {
  const livreur = await repo.trouverParId(id);
  if (!livreur) return null;
  return {
    livreur: { _id: livreur._id, email: livreur.email },
    valeurs: { nom: livreur.nom, prenom: livreur.prenom, telephone: livreur.telephone },
  };
}

// Enregistre la modification. Renvoie le livreur modifié, ou null s'il n'existe pas.
const modifierLivreur = (id, donnees) => repo.modifier(id, donnees);

module.exports = { listerLivreurs, valeursLivreur, modifierLivreur };
