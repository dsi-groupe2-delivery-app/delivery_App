const express = require("express");
const auth = require("../controllers/authController");
const { registerRules, loginRules, handleValidation } = require("../validators/auth");
const { requireAuth } = require("../middlewares/auth");

const router = express.Router();

router.post("/register", registerRules, handleValidation, auth.register);
router.post("/login", loginRules, handleValidation, auth.login);
router.post("/logout", auth.logout);
router.get("/me", requireAuth, auth.me);

module.exports = router;
