// US08 – T6 : disponibilité effective d'un menu composé.
// Règle (maquette US08) : « Indisponible » = désactivé par l'agent OU un groupe
// n'atteint plus son minimum à cause de produits indisponibles/supprimés.
// menu.groupes[].options[].produit doit être peuplé (populate) : { nom, disponible }.

const isProduitDisponible = (p) => !!p && p.disponible !== false;

function getEffectiveAvailability(menu) {
  if (!menu.disponible) return { disponible: false, raison: "Désactivé par l'agent" };
  for (const g of menu.groupes || []) {
    const n = g.options.filter((o) => isProduitDisponible(o.produit)).length;
    if (n < g.min) {
      return { disponible: false, raison: `Le groupe « ${g.libelle} » n'atteint plus son minimum` };
    }
  }
  return { disponible: true, raison: null };
}

// Produits de la composition devenus indisponibles (avertissement US09)
function getProduitsIndisponibles(groupes = [], produitsById = new Map()) {
  const noms = new Set();
  groupes.forEach((g) =>
    (g.options || []).forEach((o) => {
      const p = produitsById.get(String(o.produit));
      if (p && p.disponible === false) noms.add(p.nom);
    })
  );
  return [...noms];
}

module.exports = { isProduitDisponible, getEffectiveAvailability, getProduitsIndisponibles };
