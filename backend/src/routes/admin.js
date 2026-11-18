const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const { requireAuth, requireRole } = require("../middlewares/auth");

const router = express.Router();

// ---------- Connexion de l'agent (page EJS propre au Back-Office) ----------

// GET /admin/connexion : formulaire de connexion de l'agent
router.get("/connexion", (req, res) => {
  // Déjà connecté en tant qu'agent : directement au Back-Office.
  if (req.session.role === "admin") return res.redirect("/admin");
  res.render("admin-connexion", { erreur: null, email: "" });
});

// POST /admin/connexion : vérifie l'e-mail, le mot de passe et le rôle "admin"
router.post("/connexion", express.urlencoded({ extended: false }), async (req, res, next) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  const user = await User.findOne({ email }).select("+passwordHash");
  const ok = user && (await bcrypt.compare(password, user.passwordHash));

  // Même message dans tous les cas : on ne dit pas si c'est l'e-mail, le mot de passe ou le rôle.
  if (!ok || !user.actif || user.role !== "admin") {
    return res
      .status(401)
      .render("admin-connexion", { erreur: "Identifiants incorrects ou compte non autorisé", email });
  }

  // Nouvel identifiant de session à chaque connexion (évite la fixation de session).
  req.session.regenerate((err) => {
    if (err) return next(err);
    req.session.userId = user.id;
    req.session.role = user.role;
    req.session.save((err2) => {
      if (err2) return next(err2);
      res.redirect("/admin");
    });
  });
});

// ---------- Pages protégées ----------

// US03 : tout le reste du Back-Office est réservé à l'agent (rôle "admin") connecté.
// Visiteur non connecté -> redirigé vers /admin/connexion.
// Client ou livreur connecté -> 403 "Accès refusé".
router.use(requireAuth, requireRole("admin"));

// GET /admin : page d'accueil du Back-Office
router.get("/", (req, res) => {
  res.render("admin", { agent: req.user });
});

// POST /admin/logout : déconnexion puis retour à la page de connexion
router.post("/logout", (req, res, next) => {
  const cookieName = req.app.get("sessionCookieName");
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie(cookieName, req.app.get("sessionCookieOptions"));
    return res.redirect("/admin/connexion");
  });
});

module.exports = router;
