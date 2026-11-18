// US06 T4 : configuration de multer pour l'image d'un produit.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

// Dossier où le serveur range les images (lecture publique via /uploads/...).
const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads");
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Types acceptés et extension utilisée pour le fichier enregistré.
const TYPES_ACCEPTES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  // Nom unique : deux produits avec "pizza.jpg" ne s'écrasent pas.
  filename: (req, file, cb) => {
    cb(null, crypto.randomUUID() + TYPES_ACCEPTES[file.mimetype]);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 Mo
  fileFilter: (req, file, cb) => {
    if (TYPES_ACCEPTES[file.mimetype]) return cb(null, true);
    cb(new Error("Image refusée : formats acceptés jpg, png ou webp"));
  },
});

module.exports = { upload, UPLOADS_DIR };
