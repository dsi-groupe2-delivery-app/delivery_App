const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const ALLOWED = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, '..', 'public', 'uploads', 'menus'),
    filename: (req, file, cb) => cb(null, crypto.randomBytes(12).toString('hex') + ALLOWED[file.mimetype]),
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, !!ALLOWED[file.mimetype]),
}).single('image');
module.exports = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      req.uploadError = err.code === 'LIMIT_FILE_SIZE' ? 'Image trop lourde (2 Mo maximum)' : "Fichier d'image invalide";
    } else if (req.headers['content-type']?.startsWith('multipart') && !req.file && req.body && req.body.__hasImage === '1') {
      req.uploadError = 'Format accepté : jpg, png ou webp';
    }
    next();
  });
};
