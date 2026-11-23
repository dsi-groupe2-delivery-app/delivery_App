// Middlewares réutilisables par toutes les routes protégées (backlog US02 T4).
//
// Exemples :
//   router.get("/api/panier", requireAuth, requireRole("client"), handler);
//   router.use("/admin", requireAuth, requireRole("admin"));
//
// Après requireAuth, l'utilisateur connecté est disponible dans req.user.
const User = require("../models/User");

// Les routes /api répondent en JSON ; les pages (Back-Office EJS) redirigent.
function isApi(req) {
  return req.originalUrl.startsWith("/api/");
}

function unauthorized(req, res) {
  if (isApi(req)) {
    return res.status(401).json({ message: "Authentification requise" });
  }
  // Les pages EJS sont celles du Back-Office : on renvoie vers la connexion de l'agent.
  return res.redirect("/admin/connexion");
}

async function requireAuth(req, res, next) {
  try {
    const userId = req.session && req.session.userId;
    if (!userId) return unauthorized(req, res);

    // On relit le compte à chaque requête : un compte désactivé perd l'accès immédiatement.
    const user = await User.findById(userId);
    if (!user || !user.actif) {
      return req.session.destroy(() => unauthorized(req, res));
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

// À placer après requireAuth. Accepte un ou plusieurs rôles : requireRole("admin", "livreur").
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return unauthorized(req, res);
    if (!roles.includes(req.user.role)) {
      if (isApi(req)) return res.status(403).json({ message: "Accès refusé" });
      return res.status(403).send("Accès refusé");
    }
    next();
  };
}

function requirePasswordChanged(req, res, next) {
  if (
    req.user.role === "livreur" &&
    req.user.doitChangerMotDePasse
  ) {
    if (isApi(req)) {
      return res.status(403).json({
        message: "Vous devez changer votre mot de passe avant de continuer.",
        mustChangePassword: true
      });
    }

    return res.redirect("/changer-mot-de-passe");
  }

  next();
}


module.exports = { requireAuth, requireRole ,requirePasswordChanged};
