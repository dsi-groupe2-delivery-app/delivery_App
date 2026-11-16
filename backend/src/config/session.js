const session = require("express-session");
const { MongoStore } = require("connect-mongo");
const mongoose = require("mongoose");

const COOKIE_NAME = "sid";

function cookieOptions() {
  const prod = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    // En production, le front (autre domaine) appelle l'API : le cookie doit être
    // SameSite=None, ce qui impose Secure (HTTPS). En local, localhost:4200 et
    // localhost:3000 sont le même "site" : Lax suffit et marche en HTTP.
    secure: prod,
    sameSite: prod ? "none" : "lax",
    maxAge: 1000 * 60 * 60 * 24, // 24 h
  };
}

function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET manquant : définir le paramètre d'application Azure");
  }
  return "dev-only-secret-ne-pas-utiliser-en-production";
}

// Sessions stockées dans MongoDB, sur la connexion Mongoose de l'application.
// La promesse se résout quand mongoose.connect() réussit (server.js ou les tests).
function mongoClientWhenConnected() {
  const conn = mongoose.connection;
  if (conn.readyState === 1) return Promise.resolve(conn.getClient());
  return new Promise((resolve) => conn.once("connected", () => resolve(conn.getClient())));
}

function sessionMiddleware() {
  const store = MongoStore.create({
    clientPromise: mongoClientWhenConnected(),
    collectionName: "sessions",
  });

  return session({
    name: COOKIE_NAME,
    secret: sessionSecret(),
    store,
    resave: false,
    saveUninitialized: false, // pas de session (ni de cookie) pour un simple visiteur
    cookie: cookieOptions(),
  });
}

module.exports = { sessionMiddleware, cookieOptions, COOKIE_NAME };
