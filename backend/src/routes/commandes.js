// US14 / US15 : commandes du client. Monté sur /api/commandes dans app.js.
// Visiteur : 401. Livreur ou agent : 403. Un client ne voit que ses propres commandes.
const express = require("express");
const ctrl = require("../controllers/commandeController");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { validationRules, paiementRules } = require("../validators/commande");
const { valider } = require("../validators/cart");

const router = express.Router();

router.use(requireAuth, requireRole("client"));

router.get("/moyens-paiement", ctrl.moyens);
router.post("/", validationRules, valider, ctrl.valider); // US14
router.get("/:numero", ctrl.lire);
router.post("/:numero/paiement", paiementRules, valider, ctrl.payer); // US15
router.post("/:numero/annulation", ctrl.annuler); // US15 : paiement abandonné

module.exports = router;
