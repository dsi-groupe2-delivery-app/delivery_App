// US06 T7 : conversion des prix.
// Les prix sont stockés en millimes (nombre entier) pour éviter les erreurs
// des nombres à virgule : 12,500 TND est enregistré 12500.

// "12.5" ou "12,500" -> 12500. Renvoie null si le texte n'est pas un prix valide.
function tndVersMillimes(texte) {
  const valeur = String(texte ?? "").trim().replace(",", ".");
  // Un nombre avec au plus 3 décimales (1 TND = 1000 millimes)
  if (!/^\d+(\.\d{1,3})?$/.test(valeur)) return null;
  return Math.round(Number(valeur) * 1000);
}

// 12500 -> "12.500"
function millimesVersTnd(millimes) {
  return (millimes / 1000).toFixed(3);
}

module.exports = { tndVersMillimes, millimesVersTnd };
