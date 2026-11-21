// US11 / US12 : contrôle de saisie du panier (middleware express-validator, comme validators/auth.js).
const { body, validationResult } = require("express-validator");

const ID = /^[0-9a-fA-F]{24}$/;

// choix = { "<groupeId>": ["<produitId>", ...] }
function choixValide(valeur) {
  if (valeur === null || typeof valeur !== "object" || Array.isArray(valeur)) {
    throw new Error("Choix invalides");
  }
  for (const [groupe, produits] of Object.entries(valeur)) {
    if (!ID.test(groupe) || !Array.isArray(produits) || produits.some((p) => typeof p !== "string" || !ID.test(p))) {
      throw new Error("Choix invalides");
    }
  }
  return true;
}

const MSG_QUANTITE_AJOUT = "La quantité doit être un entier de 1 à 20";
const MSG_QUANTITE_MODIF = "La quantité doit être un entier de 1 à 20 (0 supprime la ligne)";

const ajoutRules = [
  body("type").isIn(["produit", "menu"]).withMessage("Type de ligne invalide (produit ou menu)"),
  body("produitId").if(body("type").equals("produit")).isMongoId().withMessage("Produit invalide"),
  body("menuId").if(body("type").equals("menu")).isMongoId().withMessage("Menu invalide"),
  body("quantite").optional().isInt({ min: 1, max: 20 }).withMessage(MSG_QUANTITE_AJOUT).toInt(),
  body("choix").if(body("type").equals("menu")).optional().custom(choixValide),
];

const modificationRules = [
  body().custom((corps) => corps && (corps.quantite !== undefined || corps.choix !== undefined))
    .withMessage("Indiquez une quantité ou des choix à modifier"),
  body("quantite").optional().isInt({ min: 0, max: 20 }).withMessage(MSG_QUANTITE_MODIF).toInt(),
  body("choix").optional().custom(choixValide),
];

// Renvoie 400 avec { message, errors: { champ: message } }.
function valider(req, res, next) {
  const resultat = validationResult(req);
  if (resultat.isEmpty()) return next();
  const errors = {};
  for (const e of resultat.array()) {
    const champ = e.path || "corps";
    if (!errors[champ]) errors[champ] = e.msg;
  }
  return res.status(400).json({ message: Object.values(errors)[0], errors });
}

module.exports = { ajoutRules, modificationRules, valider };
