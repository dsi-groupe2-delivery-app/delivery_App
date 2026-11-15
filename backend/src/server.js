require("dotenv").config(); // charge backend/.env en local (ignoré sur Azure)

const mongoose = require("mongoose");
const app = require("./app");

const PORT = process.env.PORT || 3000;

// Le serveur démarre même si la base est indisponible :
// /health indique alors "db": "disconnected".
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

if (!process.env.MONGODB_URI) {
  console.warn("MONGODB_URI manquant : base de données non connectée");
} else {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log("MongoDB (Cosmos DB) connecté"))
    .catch((err) => console.error("Erreur de connexion MongoDB :", err.message));
}
