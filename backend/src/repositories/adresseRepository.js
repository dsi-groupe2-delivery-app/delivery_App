// US13 : accès aux données des adresses (Mongoose). Aucune règle métier ici.
const mongoose = require("mongoose");
const Adresse = require("../models/Adresse");

// Adresses enregistrées dans le profil du client, les plus récentes d'abord (_id est toujours indexé).
const listerEnregistrees = (clientId) =>
  Adresse.find({ client: clientId, enregistree: true }).sort({ _id: -1 }).lean();

const creer = (donnees) => Adresse.create(donnees);

// Adresse d'un client précis : null si elle n'existe pas ou appartient à un autre client.
const trouverDuClient = (id, clientId) =>
  mongoose.isValidObjectId(id) ? Adresse.findOne({ _id: id, client: clientId }).lean() : null;

module.exports = { listerEnregistrees, creer, trouverDuClient };