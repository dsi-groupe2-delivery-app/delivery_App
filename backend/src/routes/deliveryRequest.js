const express = require("express");
const deliveryRequest = require("../controllers/deliveryRequestController");

const router = express.Router();

router.post("/submit", deliveryRequest.submitRequest);

module.exports = router;