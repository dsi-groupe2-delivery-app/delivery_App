// US11 / US12 : accès aux données du panier. Aucune règle métier ici.
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const MenuCompose = require("../models/MenuCompose");

// Lecture seule : null si le client n'a pas encore de panier.
const trouverParClient = (clientId) => Cart.findOne({ client: clientId });

// Renvoie le panier du client, en le créant s'il n'existe pas encore.
// L'upsert évite deux paniers si deux requêtes arrivent en même temps.
const trouverOuCreer = (clientId) =>
  Cart.findOneAndUpdate(
    { client: clientId },
    { $setOnInsert: { lignes: [] } },
    { upsert: true, returnDocument: "after" }
  );

const produitParId = (id) => Product.findById(id).lean();
const produitsParIds = (ids) => Product.find({ _id: { $in: ids } }).lean();

const POPULATE_OPTIONS = { path: "groupes.options.produit", select: "nom disponible" };
const menuParId = (id) => MenuCompose.findById(id).populate(POPULATE_OPTIONS).lean();
const menusParIds = (ids) => MenuCompose.find({ _id: { $in: ids } }).populate(POPULATE_OPTIONS).lean();

module.exports = { trouverParClient, trouverOuCreer, produitParId, produitsParIds, menuParId, menusParIds };
