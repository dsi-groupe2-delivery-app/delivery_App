// US13 T2 : contrôle de saisie d'une adresse (middleware express-validator, comme validators/cart.js).
const { body } = require("express-validator");
const { valider } = require("./cart");

const adresseRules = [
  body("libelle").optional({ values: "falsy" }).trim()
    .isLength({ max: 50 }).withMessage("Le libellé ne doit pas dépasser 50 caractères"),
  body("rue").trim()
    .notEmpty().withMessage("L'adresse est obligatoire").bail()
    .matches(/\d/).withMessage("Indiquez le numéro de la rue (ex. 5 avenue Habib Bourguiba)").bail()
    .matches(/\p{L}/u).withMessage("Indiquez le nom de la rue").bail()
    .isLength({ max: 150 }).withMessage("L'adresse ne doit pas dépasser 150 caractères"),
  body("complement").optional({ values: "falsy" }).trim()
    .isLength({ max: 150 }).withMessage("Le complément ne doit pas dépasser 150 caractères"),
  body("ville").trim()
    .notEmpty().withMessage("La ville est obligatoire").bail()
    .isLength({ max: 80 }).withMessage("La ville ne doit pas dépasser 80 caractères"),
  body("codePostal").trim()
    .matches(/^\d{4}$/).withMessage("Le code postal doit contenir 4 chiffres"),
  // « 22 000 000 » est accepté : on enlève les espaces avant de vérifier les 8 chiffres.
  body("telephone").customSanitizer((valeur) => String(valeur ?? "").replace(/\s/g, ""))
    .matches(/^\d{8}$/).withMessage("Le téléphone doit contenir 8 chiffres"),
  body("instructions").optional({ values: "falsy" }).trim()
    .isLength({ max: 200 }).withMessage("Les instructions ne doivent pas dépasser 200 caractères"),
  body("enregistrer").optional().isBoolean({ strict: true }).withMessage("Valeur invalide pour « enregistrer »"),
];

// Vérifie l'adresse choisie pour le panier : l'id doit être valide.
const choixAdresseRules = [body("adresseId").isMongoId().withMessage("Adresse invalide")];

module.exports = { adresseRules, choixAdresseRules, valider };