const service = require("../services/commandeAgentService");
const { millimesVersTnd } = require("../utils/prix");

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
  res.render("commande-detail", { commande, message: lireMessage(req), millimesVersTnd });
};
