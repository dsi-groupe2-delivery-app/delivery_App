//Demande d'inscription
const mongoose = require("mongoose");
const deliveryRequestSchema = new mongoose.Schema(
  {
    //informations de livreur
    nom: {
      type: String,
      required: true,
      trim: true,
    },
    prenom: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    telephone: {
      type: String,
      required: true,
      trim: true,
    },
    //info de livraison
    statut: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    dateDemande: {
      type: Date,
      default: Date.now,
    },
  }
);
deliveryRequestSchema.index({ dateDemande: -1 });
module.exports =
  mongoose.models.DeliveryRequest ||
  mongoose.model("DeliveryRequest", deliveryRequestSchema);
