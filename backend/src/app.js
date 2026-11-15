const path = require("path");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

// Front-ends autorisés à appeler l'API (GitHub Pages + développement local)
app.use(
  cors({
    origin: [
      "https://dsi-groupe2-delivery-app.github.io",
      "http://localhost:4200",
      "http://localhost:5500",
      "http://127.0.0.1:5500",
    ],
  })
);
app.use(express.json());

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

// Test d'infrastructure : le rendu EJS du back-office fonctionne
app.get("/admin", (req, res) => {
  res.render("admin", {
    db: DB_STATES[mongoose.connection.readyState] || "unknown",
    date: new Date().toLocaleString("fr-FR"),
  });
});

module.exports = app;
