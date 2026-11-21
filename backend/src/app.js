const path = require("path");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { sessionMiddleware, cookieOptions, COOKIE_NAME } = require("./config/session");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const { UPLOADS_DIR } = require("./config/upload");
const catalogueApiRoutes = require("./routes/catalogueApi");
const cartRoutes = require("./routes/cart");
const app = express();

// Azure App Service est derrière un proxy HTTPS : nécessaire pour le cookie "secure".
app.set("trust proxy", 1);
app.set("sessionCookieName", COOKIE_NAME);
app.set("sessionCookieOptions", (({ maxAge, ...rest }) => rest)(cookieOptions()));

// Front-ends autorisés à appeler l'API (GitHub Pages / Azure + développement local).
// credentials: true pour que le navigateur envoie le cookie de session.
const allowedOrigins = [
  "https://dsi-groupe2-delivery-app.github.io",
  "http://localhost:4200",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
];
if (process.env.FRONT_URL) allowedOrigins.push(process.env.FRONT_URL);

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
const methodOverride = require('method-override');
app.use(methodOverride('_method'));
app.use(express.urlencoded({ extended: false })); // formulaires HTML du Back-Office
app.use(sessionMiddleware());
// Images des menus composés (US08) : rangées dans src/public/uploads/menus.
app.use("/uploads/menus", express.static(path.join(__dirname, "public", "uploads", "menus")));
// Fichiers publics : images des produits (US06) et image par défaut.
app.use("/uploads", express.static(UPLOADS_DIR));
app.use("/static", express.static(path.join(__dirname, "public")));

// Vues EJS (back-office restaurant)
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

const DB_STATES = ["disconnected", "connected", "connecting", "disconnecting"];

// Test d'infrastructure : l'API répond et indique l'état de la base
const health = (req, res) => {
  res.json({
    status: "ok",
    db: DB_STATES[mongoose.connection.readyState] || "unknown",
    env: process.env.NODE_ENV || "development",
  });
};
app.get("/health", health);
app.get("/api/health", health); // même route sous /api pour les fronts
app.get("/js/menu-compose-form.js", (req, res) => {
  res.sendFile(path.join(__dirname, "scripts", "menu-compose-form.js"));
});
// Authentification (US01, US02)
app.use("/api/auth", authRoutes);

// Back-Office de l'agent (US03, US06)
app.use("/admin", adminRoutes);

// Erreurs non gérées : réponse générique, sans détail technique pour le client.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Erreur interne du serveur" });
});
// travaille de lina 
app.use('/admin/menus-composes', require('./routes/menuComposeRoutes'));
// Carte publique (US10)
app.use("/api", catalogueApiRoutes);
// Panier du client (US11)
app.use("/api/panier", cartRoutes);
module.exports = app;
