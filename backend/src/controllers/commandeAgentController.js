// US16 / US17 : pages EJS du Back-Office pour les commandes payées. Les règles sont dans services/commandeAgentService.js.
const service = require("../services/commandeAgentService");
const { millimesVersTnd } = require("../utils/prix");
const { ErreurMetier } = require("../utils/erreurs");

// Message de confirmation gardé en session pour la page suivante (affiché une seule fois).
function lireMessage(req) {
  const message = req.session.message;
  delete req.session.message;
  return message;
}

function commandeIntrouvable(res) {
  res.status(404).render("404", {
    titre: "Commande introuvable",
    texte: "Cette commande n'existe pas.",
    lienRetour: "/admin/commandes",
  });
}

// GET /admin/commandes?tri=recent|ancien
exports.liste = async (req, res) => {
  const { tri, commandes } = await service.listerPayees(String(req.query.tri || ""));
  res.render("commandes-payees", { commandes, tri, message: lireMessage(req), millimesVersTnd });
};

// GET /admin/commandes/:numero
exports.detail = async (req, res) => {
  const commande = await service.detailCommande(req.params.numero);
  if (!commande) return commandeIntrouvable(res);
  res.render("commande-detail", { commande, message: lireMessage(req), erreur: null, millimesVersTnd });
};

// POST /admin/commandes/:numero/validation (bouton « Valider la commande » de la page de détail)
exports.valider = async (req, res) => {
  try {
    const commande = await service.validerCommande(req.params.numero);
    // Comme sur la maquette : on reste sur la page de détail, qui affiche le message et le nouveau statut
    // (le bouton « Valider » a disparu : la commande n'est plus « Payée »).
    req.session.message = `Commande ${commande.numero} validée : elle passe « En préparation »`;
    return res.redirect(`/admin/commandes/${encodeURIComponent(commande.numero)}`);
  } catch (err) {
    if (!(err instanceof ErreurMetier)) throw err;
    if (err.status === 404) return commandeIntrouvable(res);
    // Pas payée, ou déjà validée : on réaffiche la commande avec le message d'erreur.
    const commande = await service.detailCommande(req.params.numero);
    if (!commande) return commandeIntrouvable(res);
    return res
      .status(err.status)
      .render("commande-detail", { commande, message: null, erreur: err.message, millimesVersTnd });
  }
};