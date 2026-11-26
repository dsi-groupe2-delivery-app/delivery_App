// US14 / US15 : API des commandes du client connecté. Les règles sont dans services/commandeService.js.
const commandes = require("../services/commandeService");
const { MOYENS } = require("../utils/paiementSimule");
const { gerer } = require("../utils/erreurs");

// POST /api/commandes : 201 si la commande vient d'être créée, 200 si c'est un double envoi.
exports.valider = gerer(async (req, res) => {
  const { commande, creee } = await commandes.validerPanier(req.user._id, req.body.cle);
  res.status(creee ? 201 : 200).json(commande);
});

exports.lire = gerer(async (req, res) => {
  res.json(await commandes.lireCommande(req.user._id, req.params.numero));
});

// GET /api/commandes/moyens-paiement : les moyens proposés sur la page de paiement.
exports.moyens = (req, res) => {
  res.json(Object.entries(MOYENS).map(([code, libelle]) => ({ code, libelle })));
};

exports.payer = gerer(async (req, res) => {
  res.json(await commandes.payer(req.user._id, req.params.numero, req.body));
});

exports.annuler = gerer(async (req, res) => {
  res.json(await commandes.annuler(req.user._id, req.params.numero));
});
