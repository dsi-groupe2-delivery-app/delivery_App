// US24 : contrôle de saisie du formulaire « Modifier un livreur » (nom, prénom, téléphone).
// Renvoie { erreurs, donnees } : une erreur par champ, affichée sous le champ concerné.
const OBLIGATOIRE = "Ce champ est obligatoire";

// Lettres (accents compris), espaces, apostrophes et tirets : « Ben Salah », « Jean-Pierre », « O'Brien ».
const NOM_VALIDE = /^\p{L}[\p{L} '’-]*$/u;

function verifierNom(valeur) {
  if (!valeur) return OBLIGATOIRE;
  if (valeur.length < 2 || valeur.length > 50) return "Entre 2 et 50 caractères";
  if (!NOM_VALIDE.test(valeur)) return "Lettres, espaces, apostrophes et tirets uniquement";
  return null;
}

function validerLivreur(body = {}) {
  const nom = String(body.nom ?? "").trim();
  const prenom = String(body.prenom ?? "").trim();
  // « 22 000 000 » est accepté : on enlève les espaces avant de vérifier les 8 chiffres (comme l'adresse, US13).
  const telephone = String(body.telephone ?? "").replace(/\s/g, "");

  const erreurs = {};
  const erreurNom = verifierNom(nom);
  const erreurPrenom = verifierNom(prenom);
  if (erreurNom) erreurs.nom = erreurNom;
  if (erreurPrenom) erreurs.prenom = erreurPrenom;
  if (!telephone) erreurs.telephone = OBLIGATOIRE;
  else if (!/^\d{8}$/.test(telephone)) erreurs.telephone = "Le téléphone doit contenir 8 chiffres";

  return { erreurs, donnees: { nom, prenom, telephone } };
}

module.exports = { validerLivreur };
