// US14 : commandes du client. Monté sur /api/commandes dans app.js.
// Visiteur : 401. Livreur ou agent : 403. Un client ne voit que ses propres commandes.
const express = require("express");
const ctrl = require("../controllers/commandeController");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { validationRules } = require("../validators/commande");
const { valider } = require("../validators/cart");

const router = express.Router();

router.use(requireAuth, requireRole("client"));

router.post("/", validationRules, valider, ctrl.valider); // US14
router.get("/:numero", ctrl.lire);

module.exports = router;
