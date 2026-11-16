const { body, validationResult } = require("express-validator");

const REQUIRED = "Ce champ est obligatoire";
const PASSWORD_RULE = "8 caractères minimum, au moins 1 lettre et 1 chiffre";

// Rôles qu'un visiteur peut cocher à l'inscription (US01). "admin" n'en fait jamais partie.
const SIGNUP_ROLES = ["client", "livreur"];

const registerRules = [
  body("role")
    .exists({ values: "falsy" })
    .withMessage("Veuillez choisir un rôle")
    .bail()
    .isIn(SIGNUP_ROLES)
    .withMessage("Rôle invalide"),
  body("nom").isString().trim().notEmpty().withMessage(REQUIRED),
  body("prenom").isString().trim().notEmpty().withMessage(REQUIRED),
  body("email")
    .isString()
    .trim()
    .notEmpty()
    .withMessage(REQUIRED)
    .bail()
    .isEmail()
    .withMessage("Format d'e-mail invalide")
    .bail()
    .toLowerCase(), // casse ignorée
  body("telephone").isString().trim().notEmpty().withMessage(REQUIRED),
  body("password")
    .isString()
    .notEmpty()
    .withMessage(REQUIRED)
    .bail()
    .isLength({ min: 8 })
    .withMessage(PASSWORD_RULE)
    .bail()
    .matches(/[A-Za-z]/)
    .withMessage(PASSWORD_RULE)
    .bail()
    .matches(/\d/)
    .withMessage(PASSWORD_RULE),
  body("passwordConfirm")
    .isString()
    .notEmpty()
    .withMessage(REQUIRED)
    .bail()
    .custom((value, { req }) => value === req.body.password)
    .withMessage("Les mots de passe ne correspondent pas"),
];

const loginRules = [
  body("email")
    .isString()
    .trim()
    .notEmpty()
    .withMessage(REQUIRED)
    .bail()
    .isEmail()
    .withMessage("Format d'e-mail invalide")
    .bail()
    .toLowerCase(),
  body("password").isString().notEmpty().withMessage(REQUIRED),
];

// Renvoie 400 avec { errors: { champ: message } } : le front affiche chaque erreur sous son champ.
function handleValidation(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const errors = {};
  for (const e of result.array()) {
    if (!errors[e.path]) errors[e.path] = e.msg;
  }
  return res.status(400).json({ errors });
}

module.exports = { registerRules, loginRules, handleValidation };
