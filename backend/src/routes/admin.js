const express = require("express");
const { requireAuth, requireRole } = require("../middlewares/auth");
const catalogue = require("../controllers/catalogueController");

const router = express.Router();

// US03 : tout le Back-Office est réservé à l'agent (rôle "admin") connecté.
// Visiteur non connecté -> redirigé vers la page de connexion du front.
// Client ou livreur connecté -> 403 "Accès refusé".
router.use(requireAuth, requireRole("admin"));

// GET /admin : page d'accueil du Back-Office
router.get("/", (req, res) => {
  res.render("admin", { agent: req.user });
});

// US06 : catégories et produits de la carte
router.get("/categories", catalogue.listeCategories);
router.post("/categories", catalogue.creerCategorie);
router.get("/produits/new", catalogue.nouveauProduit);
router.post("/produits", catalogue.creerProduit);

// POST /admin/logout : déconnexion puis retour à la page de connexion
router.post("/logout", (req, res, next) => {
  const cookieName = req.app.get("sessionCookieName");
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie(cookieName, req.app.get("sessionCookieOptions"));
    const frontUrl = process.env.FRONT_URL || "http://localhost:4200";
    return res.redirect(`${frontUrl}/connexion`);
  });
});

module.exports = router;
