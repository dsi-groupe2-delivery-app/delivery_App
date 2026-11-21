// US10 : la carte vue par le client (lecture publique). Règles métier + mise en forme.
const mongoose = require("mongoose");
const repo = require("../repositories/catalogueRepository");
const { getEffectiveAvailability } = require("../utils/availability");
const { ErreurMetier } = require("../utils/erreurs");

const IMAGE_PAR_DEFAUT = "/static/produit-defaut.svg";

// Chemin public d'une image de produit (le nom de fichier est rangé dans /uploads).
const imageProduit = (nomFichier) => (nomFichier ? `/uploads/${nomFichier}` : IMAGE_PAR_DEFAUT);
// Les menus enregistrent déjà le chemin complet (/uploads/menus/...).
const imageMenu = (chemin) => chemin || IMAGE_PAR_DEFAUT;

const versProduit = (p) => ({
  _id: p._id,
  nom: p.nom,
  description: p.description || "",
  prix: p.prixMillimes / 1000, // TND
  image: imageProduit(p.image),
  disponible: p.disponible !== false,
  categorie: p.categorie,
});

// GET /api/categories : triées par ordre ; une catégorie sans produit n'est pas affichée.
async function listerCategories() {
  const ids = await repo.idsCategoriesAvecProduits();
  const categories = await repo.categories(ids);
  return categories.map((c) => ({ _id: c._id, nom: c.nom, ordre: c.ordre }));
}

// GET /api/produits ou GET /api/produits?categorie=:id
async function listerProduits(categorieId) {
  if (categorieId !== undefined && !mongoose.isValidObjectId(categorieId)) {
    throw new ErreurMetier(400, "Catégorie invalide");
  }
  const produits = await repo.produits(categorieId ? { categorie: categorieId } : {});
  return produits.map(versProduit);
}

// GET /api/menus-composes : nom, image, « à partir de » (prix de base) et disponibilité effective.
async function listerMenus() {
  const menus = await repo.menus();
  return menus.map((m) => {
    const statut = getEffectiveAvailability(m);
    return {
      _id: m._id,
      nom: m.nom,
      description: m.description || "",
      image: imageMenu(m.image),
      prixBase: m.prixBase, // TND
      disponible: statut.disponible,
      raison: statut.raison,
    };
  });
}

// GET /api/menus-composes/:id : groupes (règle min/max) et options avec leur supplément.
async function detailMenu(id) {
  if (!mongoose.isValidObjectId(id)) throw new ErreurMetier(404, "Menu introuvable");
  const menu = await repo.menuParId(id);
  if (!menu) throw new ErreurMetier(404, "Menu introuvable");

  const statut = getEffectiveAvailability(menu);
  const groupes = [...menu.groupes]
    .sort((a, b) => a.ordre - b.ordre)
    .map((g) => ({
      _id: g._id,
      libelle: g.libelle,
      min: g.min,
      max: g.max,
      options: g.options.map((o) => ({
        // Produit supprimé (populate = null) : l'option est affichée comme indisponible.
        produit: {
          _id: o.produit ? o.produit._id : null,
          nom: o.produit ? o.produit.nom : "Produit supprimé",
          disponible: !!o.produit && o.produit.disponible !== false,
        },
        supplement: o.supplement || 0, // TND
      })),
    }));

  return {
    _id: menu._id,
    nom: menu.nom,
    description: menu.description || "",
    image: imageMenu(menu.image),
    prixBase: menu.prixBase,
    disponible: statut.disponible,
    raison: statut.raison,
    groupes,
  };
}

module.exports = { listerCategories, listerProduits, listerMenus, detailMenu, imageProduit, imageMenu };
