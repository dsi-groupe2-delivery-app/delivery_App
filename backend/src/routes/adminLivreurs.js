// US24 : gestion des livreurs dans le Back-Office. Monté sur /admin/equipe-livreurs dans routes/admin.js,
// donc déjà protégé par requireAuth + requireRole("admin") (US03) :
// visiteur -> redirigé vers /admin/connexion ; client ou livreur -> 403.
const express = require("express");
const ctrl = require("../controllers/livreurController");

const router = express.Router();

router.get("/", ctrl.liste);
router.get("/:id/edit", ctrl.formulaire);
router.put("/:id", ctrl.enregistrer);

module.exports = router;
