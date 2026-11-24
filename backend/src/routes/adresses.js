// US13 : adresses du client. Monté sur /api/adresses dans app.js.
// Visiteur : 401. Livreur ou agent : 403. Chaque client ne voit que ses propres adresses.
const express = require("express");
const ctrl = require("../controllers/adresseController");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { adresseRules, valider } = require("../validators/adresse");

const router = express.Router();

router.use(requireAuth, requireRole("client"));

router.get("/", ctrl.lister);
router.post("/", adresseRules, valider, ctrl.creer);

module.exports = router;