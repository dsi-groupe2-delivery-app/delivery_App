// US14 / US15 : contrôle de saisie des commandes et du formulaire de paiement.
const { body } = require("express-validator");
const { MOYENS, chiffres, luhnValide, expirationValide } = require("../utils/paiementSimule");

// US14 : clé unique générée par le navigateur pour cette validation (anti double clic).
const validationRules = [
  body("cle")
    .isString()
    .trim()
    .matches(/^[A-Za-z0-9-]{8,64}$/)
    .withMessage("Clé de validation invalide"),
];

// US15 : formulaire de paiement. Les messages s'affichent sous chaque champ.
const paiementRules = [
  body("moyen").isIn(Object.keys(MOYENS)).withMessage("Choisissez un moyen de paiement"),
  body("titulaire")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Ce champ est obligatoire")
    .bail()
    .isLength({ min: 2, max: 60 })
    .withMessage("Entre 2 et 60 caractères"),
  body("numeroCarte")
    .isString()
    .notEmpty()
    .withMessage("Ce champ est obligatoire")
    .bail()
    .custom((v) => /^\d{16}$/.test(chiffres(v)) && luhnValide(chiffres(v)))
    .withMessage("Numéro de carte invalide (16 chiffres)"),
  body("expiration")
    .isString()
    .notEmpty()
    .withMessage("Ce champ est obligatoire")
    .bail()
    .matches(/^\s*\d{2}\/\d{2}\s*$/)
    .withMessage("Format MM/AA attendu")
    .bail()
    .custom((v) => expirationValide(v))
    .withMessage("Carte expirée ou date invalide"),
  body("cvv")
    .isString()
    .notEmpty()
    .withMessage("Ce champ est obligatoire")
    .bail()
    .matches(/^\d{3}$/)
    .withMessage("3 chiffres au dos de la carte"),
];

module.exports = { validationRules, paiementRules };
