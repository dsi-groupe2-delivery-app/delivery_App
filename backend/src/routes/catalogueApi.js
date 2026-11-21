// US10 : lecture seule, publique. Monté sur /api dans app.js.
const express = require("express");
const ctrl = require("../controllers/catalogueApiController");

const router = express.Router();

router.get("/categories", ctrl.categories);
router.get("/produits", ctrl.produits); // ?categorie=:id facultatif
router.get("/menus-composes", ctrl.menus);
router.get("/menus-composes/:id", ctrl.menu);

module.exports = router;
