// US08 – T5 : fonction pure, réutilisée par le panier (US11/US12).
// prix final = prix de base + somme des suppléments des options choisies.
// Calcul en millimes (entiers) pour éviter les erreurs de virgule flottante.
//
// menu  : { prixBase, groupes: [{ _id, libelle, min, max, options: [{ produit, supplement }] }] }
// choix : { [groupeId]: [produitId, ...] }

class MenuChoiceError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'MenuChoiceError';
    this.details = details;
  }
}

const toMillimes = (n) => Math.round(Number(n) * 1000);
const idOf = (x) => String(x && x._id ? x._id : x);

function computeMenuComposePrice(menu, choix = {}) {
  const problems = [];
  let supplementsMillimes = 0;
  const groupeIds = new Set(menu.groupes.map((g) => idOf(g._id)));

  Object.keys(choix).forEach((gid) => {
    if (!groupeIds.has(gid)) problems.push(`Groupe inconnu : ${gid}`);
  });

  const lignes = menu.groupes.map((g) => {
    const gid = idOf(g._id);
    const selected = (choix[gid] || []).map(idOf);

    if (new Set(selected).size !== selected.length) problems.push(`Groupe « ${g.libelle} » : option choisie en double`);
    if (selected.length < g.min) problems.push(`Groupe « ${g.libelle} » : choisissez au moins ${g.min} option(s)`);
    if (selected.length > g.max) problems.push(`Groupe « ${g.libelle} » : choisissez au plus ${g.max} option(s)`);

    let sup = 0;
    selected.forEach((pid) => {
      const opt = g.options.find((o) => idOf(o.produit) === pid);
      if (!opt) problems.push(`Groupe « ${g.libelle} » : option invalide`);
      else sup += toMillimes(opt.supplement || 0);
    });
    supplementsMillimes += sup;
    return { groupeId: gid, libelle: g.libelle, produits: selected, supplement: sup / 1000 };
  });

  if (problems.length) throw new MenuChoiceError('Choix invalide', problems);

  const prixBaseMillimes = toMillimes(menu.prixBase);
  return {
    prixBase: prixBaseMillimes / 1000,
    supplements: supplementsMillimes / 1000,
    total: (prixBaseMillimes + supplementsMillimes) / 1000,
    lignes,
  };
}

module.exports = { computeMenuComposePrice, MenuChoiceError };
