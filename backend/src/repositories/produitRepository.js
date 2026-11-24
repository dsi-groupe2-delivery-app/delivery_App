// US07 : accès aux données des produits (Mongoose). Aucune règle métier ici.
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Category = require("../models/Category");

// Un id mal formé ne trouve rien 
const idValide = (id) => mongoose.isValidObjectId(id);

const lister = (filtre = {}) =>
  Product.find(filtre)
    .sort(filtre.categorie ? { categorie: 1, nom: 1 } : { nom: 1 })
    .lean();

const trouverParId = (id) => (idValide(id) ? Product.findById(id).lean() : null);
const categorieExiste = async (id) => idValide(id) && Boolean(await Category.exists({ _id: id }));
const modifier = (id, donnees) =>
  idValide(id)
    ? Product.findByIdAndUpdate(id, donnees, { returnDocument: "before", runValidators: true }).lean()
    : null;
// Catégories triées comme sur la carte 
const listerCategories = () => Category.find().sort({ ordre: 1, nom: 1 }).lean();
module.exports = { lister, listerCategories, trouverParId, categorieExiste, modifier };