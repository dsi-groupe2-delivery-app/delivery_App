const path = require("path");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { sessionMiddleware, cookieOptions, COOKIE_NAME } = require("./config/session");
const authRoutes = require("./routes/auth");

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
app.use(sessionMiddleware());

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

// Authentification (US01, US02)
app.use("/api/auth", authRoutes);

// Test d'infrastructure : le rendu EJS du back-office fonctionne
app.get("/admin", (req, res) => {
  res.render("admin", {
    db: DB_STATES[mongoose.connection.readyState] || "unknown",
    date: new Date().toLocaleString("fr-FR"),
  });
});

// Erreurs non gérées : réponse générique, sans détail technique pour le client.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Erreur interne du serveur" });
});

module.exports = app;
