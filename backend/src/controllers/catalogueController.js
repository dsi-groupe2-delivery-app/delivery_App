// US06 : l'agent ajoute des catégories et des produits (Back-Office).

const Category = require("../models/Category");
const Product = require("../models/Product");
const { upload } = require("../config/upload");
const produitService = require("../services/produitService");
const { millimesVersTnd } = require("../utils/prix");

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

async function afficherFormulaireProduit(req, res, erreurs = {}, valeurs = { disponible: "on" }, produit = null) {
  const categories = await toutesLesCategories();
  res.status(Object.keys(erreurs).length ? 400 : 200).render("produit-form", {
    categories,
    erreurs,
    valeurs,
    produit,
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
  const { erreurs, donnees } = await produitService.validerProduit(body, erreurUpload);

  if (Object.keys(erreurs).length) {
    // Rien n'est créé : on supprime l'image déjà reçue.
    if (req.file) await produitService.supprimerImage(req.file.filename);
    return afficherFormulaireProduit(req, res, erreurs, body);
  }

  await Product.create({
    nom: donnees.nom,
    description: donnees.description,
    prixMillimes: donnees.prixMillimes,
    categorie: donnees.categorie,
    disponible: donnees.disponible,
    image: req.file ? req.file.filename : null,
  });

  req.session.message = `Produit « ${donnees.nom} » ajouté`;
  res.redirect("/admin/categories");
}
//  US07 : liste et modification des produits 

async function listeProduits(req, res) {
  // La catégorie choisie dans le filtre (texte vide si « Toutes »)
  const categorieChoisie = String(req.query.categorie || "");

  const { produits, categories, filtre } = await produitService.listerProduits(categorieChoisie);

  res.render("produits", {
    produits,
    categories,
    filtre,
    message: lireMessage(req), // message de confirmation 
    millimesVersTnd,          
  });
}

function produitIntrouvable(res) {
  res.status(404).render("404", {
    titre: "Produit introuvable",
    texte: "Ce produit n'existe pas ou a été supprimé.",
    lienRetour: "/admin/produits",
  });
}

async function afficherFormulaireModification(req, res) {
  const resultat = await produitService.valeursProduit(req.params.id);
  if (!resultat) return produitIntrouvable(res);
  await afficherFormulaireProduit(req, res, {}, resultat.valeurs, resultat.produit);
}

async function enregistrerModificationProduit(req, res) {
  const erreurUpload = await recevoirImage(req, res);
  const nouvelleImage = req.file ? req.file.filename : null;

  // Produit inexistant : l'image reçue ne sert à rien.
  const resultat = await produitService.valeursProduit(req.params.id);
  if (!resultat) {
    await produitService.supprimerImage(nouvelleImage);
    return produitIntrouvable(res);
  }

  const body = req.body || {};
  const { erreurs, donnees } = await produitService.validerProduit(body, erreurUpload);

  if (Object.keys(erreurs).length) {
    // Rien n'est modifié : on supprime l'image reçue et on réaffiche le formulaire.
    await produitService.supprimerImage(nouvelleImage);
    return afficherFormulaireProduit(req, res, erreurs, body, resultat.produit);
  }

  await produitService.modifierProduit(req.params.id, donnees, nouvelleImage);
  req.session.message = `Produit « ${donnees.nom} » modifié avec succès`;
  res.redirect("/admin/produits");
}

module.exports = {
  listeCategories,
  creerCategorie,
  nouveauProduit,
  creerProduit,
  listeProduits,
  afficherFormulaireModification,
  enregistrerModificationProduit,
};
