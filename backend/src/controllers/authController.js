const bcrypt = require("bcryptjs");
const User = require("../models/User");

const BCRYPT_ROUNDS = 10;
const BAD_CREDENTIALS = "Identifiants incorrects";
const EMAIL_TAKEN = "Cet e-mail est déjà utilisé";

// Page d'arrivée après connexion, selon le rôle enregistré dans le compte (US02).
const HOME_BY_ROLE = {
  client: "/mon-espace",
  livreur: "/livreur",
  admin: "/admin", // Back-Office EJS servi par l'API
};

// POST /api/auth/register — US01
async function register(req, res, next) {
  try {
    const { role, nom, prenom, email, telephone, password } = req.body;

    // L'inscription livreur (demande à l'agent, compte en attente) arrive avec US04.
    if (role !== "client") {
      return res.status(501).json({
        message: "L'inscription livreur n'est pas encore disponible",
      });
    }

    if (await User.exists({ email })) {
      return res.status(409).json({ errors: { email: EMAIL_TAKEN } });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    // Seuls les champs autorisés sont copiés : impossible d'injecter role, actif, etc.
    const user = await User.create({
      nom,
      prenom,
      email,
      telephone,
      passwordHash,
      role: "client",
      actif: true,
    });

    return res.status(201).json({
      message: "Compte créé. Vous pouvez maintenant vous connecter.",
      user: user.toJSON(),
    });
  } catch (err) {
    // Deux inscriptions simultanées avec le même e-mail : l'index unique tranche.
    if (err && err.code === 11000) {
      return res.status(409).json({ errors: { email: EMAIL_TAKEN } });
    }
    return next(err);
  }
}

// POST /api/auth/login — US02 (écran unique pour client, livreur et agent)
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+passwordHash");

    // Même message que l'e-mail soit inconnu ou le mot de passe faux.
    const ok = user && (await bcrypt.compare(password, user.passwordHash));
    if (!ok || !user.actif) {
      return res.status(401).json({ message: BAD_CREDENTIALS });
    }

    // Nouvel identifiant de session à chaque connexion (évite la fixation de session).
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.userId = user.id;
      req.session.role = user.role;
      req.session.save((err2) => {
        if (err2) return next(err2);
        return res.json({ user: user.toJSON(), redirect: HOME_BY_ROLE[user.role] });
      });
    });
  } catch (err) {
    return next(err);
  }
}

// POST /api/auth/logout — détruit la session et le cookie
function logout(req, res, next) {
  const cookieName = req.app.get("sessionCookieName");
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie(cookieName, req.app.get("sessionCookieOptions"));
    return res.json({ message: "Déconnecté" });
  });
}

// GET /api/auth/me — profil de l'utilisateur connecté (après requireAuth)
function me(req, res) {
  return res.json({ user: req.user.toJSON() });
}


async function changePassword(req, res, next) {
  try {
    const { newPassword } = req.body;

    const user = await User.findById(req.user._id)
      .select("+passwordHash");

    // Éviter de réutiliser le mot de passe temporaire
    const samePassword = await bcrypt.compare(
      newPassword,
      user.passwordHash
    );

    if (samePassword) {
      return res.status(400).json({
        message: "Choisissez un mot de passe différent du mot de passe temporaire."
      });
    }

    // Hash du nouveau mot de passe
    user.passwordHash = await bcrypt.hash(
      newPassword,
      BCRYPT_ROUNDS
    );

    user.doitChangerMotDePasse = false;

    await user.save();

    return res.json({
      message: "Mot de passe modifié avec succès.",
      user: user.toJSON()
    });

  } catch (err) {
    return next(err);
  }
}


module.exports = { register, login, logout, me,changePassword, HOME_BY_ROLE };
