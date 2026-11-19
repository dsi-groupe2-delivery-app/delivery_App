// US08 – T2 : validation métier pure (sans accès BD), réutilisée par US09
// Structure des erreurs :
// { nom, prixBase, general, image, groupes: { [i]: { libelle, min, max, options, items: { [j]: msg } } } }

function validateMenuStructure(data = {}) {
  const errors = {};

  const nom = String(data.nom || '').trim();
  if (!nom) errors.nom = 'Le nom est obligatoire';
  else if (nom.length < 2 || nom.length > 100) errors.nom = 'Le nom doit contenir de 2 à 100 caractères';

  const prix = Number(data.prixBase);
  if (!Number.isFinite(prix) || prix <= 0) errors.prixBase = 'Le prix de base doit être strictement positif';

  const groupes = Array.isArray(data.groupes) ? data.groupes : [];
  if (groupes.length < 1) errors.general = 'Un menu composé doit contenir au moins 1 groupe';

  const groupesErrors = {};
  groupes.forEach((g, i) => {
    const e = {};
    const options = Array.isArray(g.options) ? g.options : [];
    const n = options.length;

    if (!String(g.libelle || '').trim()) e.libelle = 'Le libellé est obligatoire';
    if (n < 1) e.options = 'Ajoutez au moins 1 option';

    const min = Number(g.min);
    const max = Number(g.max);
    if (!Number.isInteger(min) || min < 0) e.min = 'Le minimum doit être un entier ≥ 0';
    if (!Number.isInteger(max) || max < 1) e.max = 'Le maximum doit être un entier ≥ 1';
    else if (Number.isInteger(min) && max < min) e.max = 'Le maximum doit être ≥ au minimum';
    else if (n >= 1 && max > n) e.max = `Le maximum (${max}) dépasse le nombre d'options (${n})`;

    const items = {};
    const seen = new Set();
    options.forEach((o, j) => {
      const id = o.produit ? String(o.produit) : '';
      const sup = o.supplement === undefined || o.supplement === '' ? 0 : Number(o.supplement);
      if (!id) items[j] = 'Choisissez un produit';
      else if (seen.has(id)) items[j] = 'Ce produit figure déjà dans ce groupe';
      else if (!Number.isFinite(sup) || sup < 0) items[j] = 'Le supplément doit être ≥ 0';
      if (id) seen.add(id);
    });
    if (Object.keys(items).length) e.items = items;

    if (Object.keys(e).length) groupesErrors[i] = e;
  });
  if (Object.keys(groupesErrors).length) errors.groupes = groupesErrors;

  return errors;
}

// Avertissement (non bloquant) : groupe avec une seule option => ce n'est plus un choix
function findSingleOptionGroups(groupes = []) {
  return groupes.reduce((acc, g, i) => {
    if (Array.isArray(g.options) && g.options.length === 1) acc.push(i);
    return acc;
  }, []);
}

module.exports = { validateMenuStructure, findSingleOptionGroups };
