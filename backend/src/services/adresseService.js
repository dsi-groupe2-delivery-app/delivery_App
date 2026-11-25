// US13 : règles métier des adresses de livraison.
const repo = require("../repositories/adresseRepository");

// Ce que l'API renvoie au navigateur 
function vueAdresse(adresse) {
  return {
    _id: adresse._id,
    libelle: adresse.libelle,
    rue: adresse.rue,
    complement: adresse.complement,
    ville: adresse.ville,
    codePostal: adresse.codePostal,
    telephone: adresse.telephone,
    instructions: adresse.instructions,
    enregistree: adresse.enregistree,
  };
}

async function listerAdresses(clientId) {
  const adresses = await repo.listerEnregistrees(clientId);
  return adresses.map(vueAdresse);
}

//  le client est toujours celui de la session, jamais celui du corps.
async function creerAdresse(clientId, donnees) {
  const adresse = await repo.creer({
    client: clientId,
    libelle: donnees.libelle || "",
    rue: donnees.rue,
    complement: donnees.complement || "",
    ville: donnees.ville,
    codePostal: donnees.codePostal,
    telephone: donnees.telephone,
    instructions: donnees.instructions || "",
    enregistree: donnees.enregistrer === true,
  });
  return vueAdresse(adresse);
}

// Cherche une adresse du client connecté.
// Renvoie null si l'adresse n'existe pas ou appartient à un autre client.
async function adresseDuClient(adresseId, clientId) {
  const adresse = await repo.trouverDuClient(adresseId, clientId);
  return adresse ? vueAdresse(adresse) : null;
}

module.exports = { listerAdresses, creerAdresse, adresseDuClient, vueAdresse };