// US13 : API des adresses du client connecté. req.user vient de requireAuth.
const { matchedData } = require("express-validator");
const adresses = require("../services/adresseService");
const { gerer } = require("../utils/erreurs");

exports.lister = gerer(async (req, res) => {
  res.json(await adresses.listerAdresses(req.user._id));
});

// matchedData : seulement les champs validés par adresseRules (un champ « client » ajouté est ignoré).
exports.creer = gerer(async (req, res) => {
  res.status(201).json(await adresses.creerAdresse(req.user._id, matchedData(req)));
});