// US11 / US12 : API du panier du client connecté. req.user vient de requireAuth.
// Le contrôleur lit la requête et répond ; les règles sont dans services/cartService.js.
const panier = require("../services/cartService");
const { gerer } = require("../utils/erreurs");

exports.lire = gerer(async (req, res) => {
  res.json(await panier.lirePanier(req.user._id));
});

exports.ajouter = gerer(async (req, res) => {
  res.status(201).json(await panier.ajouterLigne(req.user._id, req.body));
});

exports.modifier = gerer(async (req, res) => {
  const { quantite, choix } = req.body;
  res.json(await panier.modifierLigne(req.user._id, req.params.id, { quantite, choix }));
});

exports.supprimer = gerer(async (req, res) => {
  res.json(await panier.supprimerLigne(req.user._id, req.params.id));
});

exports.vider = gerer(async (req, res) => {
  res.json(await panier.viderPanier(req.user._id));
});

exports.choisirAdresse = gerer(async (req, res) => {
  res.json(await panier.choisirAdresse(req.user._id, req.body.adresseId));
});