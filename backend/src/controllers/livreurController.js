// US24 : pages EJS du Back-Office pour modifier les livreurs. Les règles sont dans services/livreurService.js.
const service = require("../services/livreurService");
const { validerLivreur } = require("../validators/livreur");

// Message de confirmation gardé en session pour la page suivante (affiché une seule fois).
function lireMessage(req) {
  const message = req.session.message;
  delete req.session.message;
  return message;
}

function livreurIntrouvable(res) {
  res.status(404).render("404", {
    titre: "Livreur introuvable",
    texte: "Ce livreur n'existe pas.",
    lienRetour: "/admin/equipe-livreurs",
  });
}

// GET /admin/equipe-livreurs
exports.liste = async (req, res) => {
  const livreurs = await service.listerLivreurs();
  res.render("equipe-livreurs", { livreurs, message: lireMessage(req) });
};

// GET /admin/equipe-livreurs/:id/edit
exports.formulaire = async (req, res) => {
  const resultat = await service.valeursLivreur(req.params.id);
  if (!resultat) return livreurIntrouvable(res);
  res.render("livreur-form", { livreur: resultat.livreur, valeurs: resultat.valeurs, erreurs: {} });
};

// PUT /admin/equipe-livreurs/:id (le formulaire envoie POST + ?_method=PUT)
exports.enregistrer = async (req, res) => {
  const resultat = await service.valeursLivreur(req.params.id);
  if (!resultat) return livreurIntrouvable(res);

  const body = req.body || {};
  const { erreurs, donnees } = validerLivreur(body);
  if (Object.keys(erreurs).length) {
    // Rien n'est modifié : on réaffiche le formulaire avec ce que l'agent a saisi.
    return res.status(400).render("livreur-form", { livreur: resultat.livreur, valeurs: body, erreurs });
  }

  const modifie = await service.modifierLivreur(req.params.id, donnees);
  if (!modifie) return livreurIntrouvable(res);

  req.session.message = `Livreur « ${modifie.prenom} ${modifie.nom} » modifié avec succès`;
  res.redirect("/admin/equipe-livreurs");
};
