// US16 / US17 : accès aux commandes pour le Back-Office de l'agent. Aucune règle métier ici.
const Commande = require("../models/Commande");



const payees = (ordre) =>
  Commande.find({ statut: "payee" }).sort({ createdAt: ordre }).populate("client", "nom prenom").lean();

// Une commande avec les coordonnées de son client (null si le numéro n'existe pas).
const parNumero = (numero) =>
  Commande.findOne({ numero: String(numero) }).populate("client", "nom prenom email telephone").lean();

module.exports = { payees, parNumero };
