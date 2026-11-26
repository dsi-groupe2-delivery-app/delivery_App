// US14 : contrôle de saisie de la validation du panier.
const { body } = require("express-validator");

// Clé unique générée par le navigateur pour cette validation (anti double clic).
const validationRules = [
  body("cle")
    .isString()
    .trim()
    .matches(/^[A-Za-z0-9-]{8,64}$/)
    .withMessage("Clé de validation invalide"),
];

module.exports = { validationRules };
