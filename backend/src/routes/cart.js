// US11 : panier du client. Monté sur /api/panier dans app.js.
// Visiteur : 401. Livreur ou agent : 403. Chaque client n'agit que sur son propre panier.
const express = require("express");
const ctrl = require("../controllers/cartController");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { ajoutRules, valider } = require("../validators/cart");

const router = express.Router();

router.use(requireAuth, requireRole("client"));

router.get("/", ctrl.lire);
router.post("/lignes", ajoutRules, valider, ctrl.ajouter);

module.exports = router;
