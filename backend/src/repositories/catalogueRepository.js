// US10 : accès aux données de la carte (lecture seule). Aucune règle métier ici.
const Category = require("../models/Category");
const Product = require("../models/Product");
const MenuCompose = require("../models/MenuCompose");

// Identifiants des catégories qui contiennent au moins un produit.
const idsCategoriesAvecProduits = () => Product.distinct("categorie");

const categories = (ids) =>
  Category.find({ _id: { $in: ids } })
    .sort({ ordre: 1, nom: 1 }) // index { ordre: 1, nom: 1 } dans Category
    .lean();

// filtre = {} (tous les produits) ou { categorie: id }.
const produits = (filtre = {}) =>
  Product.find(filtre)
    .sort(filtre.categorie ? { categorie: 1, nom: 1 } : { nom: 1 }) // index dans Product
    .lean();

const POPULATE_OPTIONS = { path: "groupes.options.produit", select: "nom disponible image" };

const menus = () => MenuCompose.find().sort({ nom: 1 }).populate(POPULATE_OPTIONS).lean();

const menuParId = (id) => MenuCompose.findById(id).populate(POPULATE_OPTIONS).lean();

module.exports = { idsCategoriesAvecProduits, categories, produits, menus, menuParId };
