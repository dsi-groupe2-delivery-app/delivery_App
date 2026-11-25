// Règles métier des produits.
const fs = require("fs");
const path = require("path");
const repo = require("../repositories/produitRepository");
const { UPLOADS_DIR } = require("../config/upload");
const { tndVersMillimes, millimesVersTnd } = require("../utils/prix");

// Vérifie le formulaire produit 
async function validerProduit(body = {}, erreurUpload) {
  const erreurs = {};

  if (erreurUpload) {
    erreurs.image =
      erreurUpload.code === "LIMIT_FILE_SIZE"
        ? "Image trop lourde : 2 Mo maximum"
        : erreurUpload.message;
  }

  const nom = String(body.nom || "").trim();
  if (!nom) erreurs.nom = "Le nom est obligatoire";

  const prixMillimes = tndVersMillimes(body.prix);
  if (prixMillimes === null || prixMillimes < 1) {
    erreurs.prix = "Le prix doit être supérieur à 0 (3 décimales maximum, ex. 12.500)";
  }

  if (!(await repo.categorieExiste(body.categorie))) {
    erreurs.categorie = "Choisissez une catégorie existante";
  }

  const donnees = {
    nom,
    description: String(body.description || "").trim(),
    prixMillimes,
    categorie: body.categorie,
    disponible: body.disponible === "on",
  };
  return { erreurs, donnees };
}

// Supprime une image du dossier uploads.
async function supprimerImage(nomFichier) {
  if (!nomFichier) return;
  try {
    await fs.promises.unlink(path.join(UPLOADS_DIR, path.basename(nomFichier)));
  } catch (err) {
    if (err.code !== "ENOENT") console.error("Suppression de l'image impossible :", err);
  }
}

// Liste des produits, filtrable par catégorie (T4).
async function listerProduits(categorieId) {
  const categories = await repo.listerCategories();
  const filtre = categories.some((c) => String(c._id) === categorieId) ? categorieId : "";
  const produits = await repo.lister(filtre ? { categorie: filtre } : {});

  const nomsCategories = new Map(categories.map((c) => [String(c._id), c.nom]));
  return {
    categories,
    filtre,
    produits: produits.map((p) => ({
      _id: p._id,
      nom: p.nom,
      image: p.image,
      prixMillimes: p.prixMillimes,
      disponible: p.disponible,
      nomCategorie: nomsCategories.get(String(p.categorie)) || "—",
    })),
  };
}
// Valeurs actuelles d'un produit pour pré-remplir le formulaire

async function valeursProduit(id) {
  const produit = await repo.trouverParId(id);
  if (!produit) return null;
  return {
    produit: { _id: produit._id, image: produit.image },
    valeurs: {
      nom: produit.nom,
      description: produit.description,
      prix: millimesVersTnd(produit.prixMillimes),
      categorie: String(produit.categorie),
      disponible: produit.disponible ? "on" : "",
    },
  };
}
// Enregistre la modification. Si une nouvelle image est envoyée, l'ancienne est supprimée (T5).
async function modifierProduit(id, donnees, nouvelleImage) {
  const champs = {
    nom: donnees.nom,
    description: donnees.description,
    prixMillimes: donnees.prixMillimes,
    categorie: donnees.categorie,
    disponible: donnees.disponible,
  };
  // Sans nouvelle image, on ne touche pas au champ image : l'image actuelle est gardée.
  if (nouvelleImage) champs.image = nouvelleImage;

  const ancien = await repo.modifier(id, champs); // renvoie le produit AVANT la modification
  if (ancien && nouvelleImage) await supprimerImage(ancien.image);
  return ancien;
}

module.exports = {
  validerProduit,
  supprimerImage,
  listerProduits,
  valeursProduit,
  modifierProduit,
};