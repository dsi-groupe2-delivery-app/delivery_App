// Transforme req.body (champs imbriqués groupes[i][options][j][...]) en objet propre.
// L'ordre des groupes = ordre des index dans le formulaire (le JS réindexe après ↑ ↓ ✕).
const OBJECT_ID = /^[a-f\d]{24}$/i;

function toArray(x) {
  if (Array.isArray(x)) return x.filter(Boolean);
  if (x && typeof x === 'object') {
    return Object.keys(x).sort((a, b) => Number(a) - Number(b)).map((k) => x[k]);
  }
  return [];
}

function toNumber(v) {
  if (v === undefined || v === null || String(v).trim() === '') return NaN;
  return Number(String(v).replace(',', '.'));
}

function normalizeMenuBody(body = {}) {
  const groupes = toArray(body.groupes).map((g, i) => ({
    _id: OBJECT_ID.test(g._id || '') ? g._id : undefined,
    libelle: String(g.libelle || '').trim(),
    min: toNumber(g.min),
    max: toNumber(g.max),
    ordre: i,
    options: toArray(g.options).map((o) => ({
      produit: OBJECT_ID.test(o.produit || '') ? o.produit : '',
      supplement: o.supplement === undefined || String(o.supplement).trim() === '' ? 0 : toNumber(o.supplement),
    })),
  }));

  return {
    nom: String(body.nom || '').trim(),
    description: String(body.description || '').trim(),
    prixBase: toNumber(body.prixBase),
    disponible: body.disponible === 'on' || body.disponible === 'true',
    groupes,
  };
}

module.exports = { normalizeMenuBody, OBJECT_ID };
