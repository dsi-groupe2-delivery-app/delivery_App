// US24 : accès aux données des livreurs (comptes User de rôle "livreur"). Aucune règle métier ici.
const User = require("../models/User");

// Un identifiant mal formé ne trouve rien (au lieu de faire planter la requête).
const idValide = (id) => /^[0-9a-fA-F]{24}$/.test(String(id));

// Pas de .sort() ici : l'équipe de livraison est petite, le service trie en mémoire.
// (Un .sort() demanderait un nouvel index sur le modèle User, que d'autres développeurs utilisent.)
const lister = () => User.find({ role: "livreur" }).lean();

// Seul un compte de rôle "livreur" est trouvé : l'id d'un client ou d'un agent donne null.
const trouverParId = (id) => (idValide(id) ? User.findOne({ _id: id, role: "livreur" }).lean() : null);

// Ne modifie que nom, prénom et téléphone. Renvoie le livreur modifié, ou null s'il n'existe pas.
const modifier = (id, donnees) =>
  idValide(id)
    ? User.findOneAndUpdate(
        { _id: id, role: "livreur" },
        { nom: donnees.nom, prenom: donnees.prenom, telephone: donnees.telephone },
        { returnDocument: "after", runValidators: true }
      ).lean()
    : null;

module.exports = { lister, trouverParId, modifier };
