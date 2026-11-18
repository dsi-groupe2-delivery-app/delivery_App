// US06 : l'agent ajoute des catégories et des produits (Back-Office).
const fs = require("fs");
const mongoose = require("mongoose");
const Category = require("../models/Category");
const Product = require("../models/Product");
const { upload } = require("../config/upload");
const { tndVersMillimes, millimesVersTnd } = require("../utils/prix");

// Message de succès gardé en session pour la page suivante (affiché une seule fois).
function lireMessage(req) {
  const message = req.session.message;
  delete req.session.message;
  return message;
}

// Catégories triées par ordre d'affichage, puis par nom.
function toutesLesCategories() {
  return Category.find().sort({ ordre: 1, nom: 1 }).lean();
}

// ---------- Catégories ----------

// Affiche la page : chaque catégorie avec ses produits + le formulaire d'ajout.
async function afficherCategories(req, res, erreurs = {}, valeurs = {}) {
  const categories = await toutesLesCategories();
  const produits = await Product.find().sort({ nom: 1 }).lean();

  // On range chaque produit sous sa catégorie.
  for (const categorie of categories) {
    categorie.produits = produits.filter((p) => p.categorie.equals(categorie._id));
  }

  res.status(Object.keys(erreurs).length ? 400 : 200).render("categories", {
    categories,
    message: lireMessage(req),
    erreurs,
    valeurs,
    millimesVersTnd,
  });
}

// GET /admin/categories
async function listeCategories(req, res) {
  await afficherCategories(req, res);
}

// POST /admin/categories
async function creerCategorie(req, res) {
  const nom = (req.body.nom || "").trim();
  const ordre = (req.body.ordre || "").trim();
  const erreurs = {};

  if (nom.length < 2 || nom.length > 50) {
    erreurs.nom = "Le nom doit contenir entre 2 et 50 caractères";
  } else if (await Category.exists({ nomMinuscule: nom.toLowerCase() })) {
    erreurs.nom = `La catégorie « ${nom} » existe déjà`;
  }
  if (ordre !== "" && !/^\d+$/.test(ordre)) {
    erreurs.ordre = "L'ordre doit être un nombre entier positif";
  }

  if (Object.keys(erreurs).length) {
    return afficherCategories(req, res, erreurs, { nom, ordre });
  }

  await Category.create({ nom, ordre: ordre === "" ? 0 : Number(ordre) });
  req.session.message = `Catégorie « ${nom} » ajoutée`;
  res.redirect("/admin/categories");
}

// ---------- Produits ----------

// Affiche le formulaire d'ajout d'un produit.
async function afficherFormulaireProduit(req, res, erreurs = {}, valeurs = { disponible: "on" }) {
  const categories = await toutesLesCategories();
  res.status(Object.keys(erreurs).length ? 400 : 200).render("produit-form", {
    categories,
    erreurs,
    valeurs,
  });
}

// GET /admin/produits/new
async function nouveauProduit(req, res) {
  await afficherFormulaireProduit(req, res);
}

// Reçoit l'image avec multer. Renvoie l'erreur éventuelle au lieu de planter.
function recevoirImage(req, res) {
  return new Promise((resolve) => {
    upload.single("image")(req, res, (err) => resolve(err));
  });
}

// POST /admin/produits
async function creerProduit(req, res) {
  const erreurUpload = await recevoirImage(req, res);
  const body = req.body || {};
  const erreurs = {};

  if (erreurUpload) {
    erreurs.image =
      erreurUpload.code === "LIMIT_FILE_SIZE"
        ? "Image trop lourde : 2 Mo maximum"
        : erreurUpload.message;
  }

  const nom = (body.nom || "").trim();
  if (!nom) erreurs.nom = "Le nom est obligatoire";

  const prixMillimes = tndVersMillimes(body.prix);
  if (!prixMillimes) {
    erreurs.prix = "Le prix doit être supérieur à 0 (3 décimales maximum, ex. 12.500)";
  }

  const categorieExiste =
    mongoose.isValidObjectId(body.categorie) && (await Category.exists({ _id: body.categorie }));
  if (!categorieExiste) erreurs.categorie = "Choisissez une catégorie existante";

  if (Object.keys(erreurs).length) {
    // Rien n'est créé : on supprime l'image déjà reçue.
    if (req.file) fs.unlink(req.file.path, () => {});
    return afficherFormulaireProduit(req, res, erreurs, body);
  }

  await Product.create({
    nom,
    description: (body.description || "").trim(),
    prixMillimes,
    image: req.file ? req.file.filename : null,
    categorie: body.categorie,
    disponible: body.disponible === "on", // case à cocher
  });

  req.session.message = `Produit « ${nom} » ajouté`;
  res.redirect("/admin/categories");
}

module.exports = {
  listeCategories,
  creerCategorie,
  nouveauProduit,
  creerProduit,
};
