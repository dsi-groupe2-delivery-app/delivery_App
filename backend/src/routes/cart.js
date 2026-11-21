// US11 / US12 : panier du client. Monté sur /api/panier dans app.js.
// Visiteur : 401. Livreur ou agent : 403. Chaque client n'agit que sur son propre panier.
const express = require("express");
const ctrl = require("../controllers/cartController");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { ajoutRules, modificationRules, valider } = require("../validators/cart");

const router = express.Router();

router.use(requireAuth, requireRole("client"));

router.get("/", ctrl.lire);
router.delete("/", ctrl.vider);
router.post("/lignes", ajoutRules, valider, ctrl.ajouter);
router.patch("/lignes/:id", modificationRules, valider, ctrl.modifier);
router.delete("/lignes/:id", ctrl.supprimer);

module.exports = router;
