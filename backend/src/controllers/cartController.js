// US11 / US12 : API du panier du client connecté (US11 : lire et ajouter). req.user vient de requireAuth.
// Le contrôleur lit la requête et répond ; les règles sont dans services/cartService.js.
const panier = require("../services/cartService");
const { gerer } = require("../utils/erreurs");

exports.lire = gerer(async (req, res) => {
  res.json(await panier.lirePanier(req.user._id));
});

exports.ajouter = gerer(async (req, res) => {
  res.status(201).json(await panier.ajouterLigne(req.user._id, req.body));
});
