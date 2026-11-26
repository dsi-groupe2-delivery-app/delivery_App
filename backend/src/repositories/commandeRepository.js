// US14 / US15 : accès aux données des commandes. Aucune règle métier ici.
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

// Change le statut seulement si la commande est encore dans le statut attendu.
// Renvoie null si quelqu'un l'a changé entre-temps (ex. double paiement).
const changerStatutSi = (id, statutAttendu, nouveauStatut, autres = {}) =>
  Commande.findOneAndUpdate(
    { _id: id, statut: statutAttendu },
    {
      $set: { statut: nouveauStatut, ...(autres.$set || {}) },
      $push: { historique: { statut: nouveauStatut, date: new Date() }, ...(autres.$push || {}) },
    },
    { returnDocument: "after" }
  );

const ajouterTransaction = (id, transaction) =>
  Commande.findByIdAndUpdate(id, { $push: { transactions: transaction } }, { returnDocument: "after" });

module.exports = { prochainNumeroDuJour, creer, parCle, duClient, changerStatutSi, ajouterTransaction };
