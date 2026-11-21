// Erreur "métier" : porte le code HTTP à renvoyer au client (400, 404, 409...).
// Les services la lancent ; le contrôleur la transforme en réponse JSON.
// Toute autre erreur (bug, base indisponible) reste une 500 gérée par app.js.
class ErreurMetier extends Error {
    constructor(status, message, details = []) {
      super(message);
      this.name = "ErreurMetier";
      this.status = status;
      this.details = details;
    }
  }
  
  // Enveloppe un contrôleur async : transforme ErreurMetier en réponse JSON.
  const gerer = (fn) => async (req, res, next) => {
    try {
      await fn(req, res);
    } catch (err) {
      if (err instanceof ErreurMetier) {
        return res.status(err.status).json({ message: err.message, details: err.details });
      }
      next(err);
    }
  };
  
  module.exports = { ErreurMetier, gerer };
  