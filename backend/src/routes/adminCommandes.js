// US16 : commandes payées dans le Back-Office. Monté sur /admin/commandes dans routes/admin.js,
// donc déjà protégé par requireAuth + requireRole("admin") (US03) :
// visiteur -> redirigé vers /admin/connexion ; client ou livreur -> 403.
const express = require("express");
const ctrl = require("../controllers/commandeAgentController");

const router = express.Router();

router.get("/", ctrl.liste);
router.get("/:numero", ctrl.detail);

module.exports = router;
