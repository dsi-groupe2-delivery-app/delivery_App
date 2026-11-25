// US14 : accès aux données des commandes. Aucune règle métier ici.
const Commande = require("../models/Commande");
const Compteur = require("../models/Compteur");

// Numéro suivant du jour : 1, 2, 3... (incrément atomique).
async function prochainNumeroDuJour(jour) {
  const compteur = await Compteur.findOneAndUpdate(
    { _id: `commande-${jour}` },
    { $inc: { valeur: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  return compteur.valeur;
}

const creer = (donnees) => Commande.create(donnees);
const parCle = (clientId, cle) => Commande.findOne({ client: clientId, cle });
const duClient = (numero, clientId) => Commande.findOne({ numero, client: clientId });

module.exports = { prochainNumeroDuJour, creer, parCle, duClient };
