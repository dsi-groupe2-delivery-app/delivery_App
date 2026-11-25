// US15 : paiement SIMULÉ (mode test). Aucun argent réel, aucun prestataire externe.
// Le numéro de carte est contrôlé puis oublié : seuls les 4 derniers chiffres sont gardés.
const crypto = require("crypto");

// Moyens de paiement proposés au client.
const MOYENS = {
  carte_bancaire: "Carte bancaire (Visa / Mastercard)",
  edinar: "Carte e-DINAR",
};

// Cartes de test toujours refusées, pour montrer le cas « paiement refusé » en démonstration.
const CARTES_REFUSEES = {
  "4000000000000002": "Carte refusée par la banque",
  "4000000000009995": "Fonds insuffisants",
};

const chiffres = (texte) => String(texte ?? "").replace(/[\s-]/g, "");

// Algorithme de Luhn : détecte une faute de frappe dans un numéro de carte.
function luhnValide(numero) {
  let somme = 0;
  for (let i = 0; i < numero.length; i++) {
    let n = Number(numero[numero.length - 1 - i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    somme += n;
  }
  return somme % 10 === 0;
}

// "MM/AA" -> true si la carte est encore valide ce mois-ci.
function expirationValide(texte, maintenant = new Date()) {
  const m = /^(\d{2})\/(\d{2})$/.exec(String(texte ?? "").trim());
  if (!m) return false;
  const mois = Number(m[1]);
  const annee = 2000 + Number(m[2]);
  if (mois < 1 || mois > 12) return false;
  return annee > maintenant.getFullYear() || (annee === maintenant.getFullYear() && mois >= maintenant.getMonth() + 1);
}

// Résultat de la banque simulée : { acceptee, motif? }.
function demanderAutorisation(numeroCarte) {
  const motif = CARTES_REFUSEES[chiffres(numeroCarte)];
  return motif ? { acceptee: false, motif } : { acceptee: true };
}

const nouvelleReference = () => `PAY-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;

module.exports = { MOYENS, CARTES_REFUSEES, chiffres, luhnValide, expirationValide, demanderAutorisation, nouvelleReference };
