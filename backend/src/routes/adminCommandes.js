// US16 / US17 : commandes payées et leur validation. Monté sur /admin/commandes dans routes/admin.js,
// donc déjà protégé par requireAuth + requireRole("admin") (US03) :
// visiteur -> redirigé vers /admin/connexion ; client ou livreur -> 403.
const express = require("express");
const ctrl = require("../controllers/commandeAgentController");

const router = express.Router();

router.get("/", ctrl.liste);
router.get("/:numero", ctrl.detail);
router.post("/:numero/validation", ctrl.valider); // US17

module.exports = router;
