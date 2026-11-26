// US14 : API des commandes du client connecté. Les règles sont dans services/commandeService.js.
const commandes = require("../services/commandeService");
const { gerer } = require("../utils/erreurs");

// POST /api/commandes : 201 si la commande vient d'être créée, 200 si c'est un double envoi.
exports.valider = gerer(async (req, res) => {
  const { commande, creee } = await commandes.validerPanier(req.user._id, req.body.cle);
  res.status(creee ? 201 : 200).json(commande);
});

exports.lire = gerer(async (req, res) => {
  res.json(await commandes.lireCommande(req.user._id, req.params.numero));
});
