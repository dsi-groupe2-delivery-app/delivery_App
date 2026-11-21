// US10 : API publique de lecture de la carte (aucune connexion requise).
// Le contrôleur ne fait que lire la requête et renvoyer la réponse : la logique est dans le service.
const catalogue = require("../services/catalogueService");
const { gerer } = require("../utils/erreurs");

exports.categories = gerer(async (req, res) => {
  res.json(await catalogue.listerCategories());
});

exports.produits = gerer(async (req, res) => {
  res.json(await catalogue.listerProduits(req.query.categorie));
});

exports.menus = gerer(async (req, res) => {
  res.json(await catalogue.listerMenus());
});

exports.menu = gerer(async (req, res) => {
  res.json(await catalogue.detailMenu(req.params.id));
});
