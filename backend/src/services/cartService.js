// US11 (ajout au panier) et US12 (modification du panier) : toutes les règles du panier.
// Le serveur est seul juge : prix, total et disponibilité sont recalculés ici, jamais lus du navigateur.
const mongoose = require("mongoose");
const repo = require("../repositories/cartRepository");
const { computeMenuComposePrice, MenuChoiceError } = require("../utils/computeMenuComposePrice");
const { getEffectiveAvailability } = require("../utils/availability");
const { imageProduit, imageMenu } = require("./catalogueService");
const { ErreurMetier } = require("../utils/erreurs");

const QUANTITE_MAX = 20;

const idDe = (x) => String(x && x._id ? x._id : x);
const enMillimes = (tnd) => Math.round(Number(tnd) * 1000);
const formaterTnd = (millimes) => (millimes / 1000).toFixed(3);

// ---------- Choix d'un menu : objet { groupeId: [produitId] } <-> tableau stocké en base ----------

function choixVersTableau(choix = {}) {
  return Object.entries(choix)
    .filter(([, produits]) => produits.length > 0)
    .map(([groupe, produits]) => ({ groupe, produits }));
}

function tableauVersChoix(tableau = []) {
  const choix = {};
  for (const c of tableau) choix[String(c.groupe)] = c.produits.map(String);
  return choix;
}

// Deux lignes de menu sont "les mêmes" si le menu et les choix sont identiques (ordre ignoré).
function signature(tableau = []) {
  return JSON.stringify(
    tableau
      .map((c) => [String(c.groupe), c.produits.map(String).sort()])
      .sort((a, b) => a[0].localeCompare(b[0]))
  );
}

// ---------- Contrôles d'un menu composé ----------

// Prix unitaire (millimes) d'un menu avec ces choix. Refuse un choix incomplet ou en trop,
// avec un message qui nomme le groupe concerné (fourni par computeMenuComposePrice).
function prixMenu(menu, choix) {
  try {
    return enMillimes(computeMenuComposePrice(menu, choix).total);
  } catch (err) {
    if (err instanceof MenuChoiceError) {
      throw new ErreurMetier(400, err.details.join(" ; "), err.details);
    }
    throw err;
  }
}

function verifierOptionsDisponibles(menu, choix) {
  for (const g of menu.groupes) {
    for (const produitId of choix[idDe(g._id)] || []) {
      const option = g.options.find((o) => idDe(o.produit) === produitId);
      if (!option || !option.produit || option.produit.disponible === false) {
        const nom = option && option.produit ? option.produit.nom : "supprimée";
        throw new ErreurMetier(409, `L'option « ${nom} » du groupe « ${g.libelle} » est indisponible`);
      }
    }
  }
}

// Charge un menu, vérifie qu'il est commandable avec ces choix et renvoie son prix unitaire.
async function preparerMenu(menuId, choix) {
  if (!mongoose.isValidObjectId(menuId)) throw new ErreurMetier(404, "Menu introuvable");
  const menu = await repo.menuParId(menuId);
  if (!menu) throw new ErreurMetier(404, "Menu introuvable");

  const statut = getEffectiveAvailability(menu);
  if (!statut.disponible) throw new ErreurMetier(409, `Le menu « ${menu.nom} » est indisponible`);

  const prix = prixMenu(menu, choix);
  verifierOptionsDisponibles(menu, choix);
  return prix;
}

async function preparerProduit(produitId) {
  if (!mongoose.isValidObjectId(produitId)) throw new ErreurMetier(404, "Produit introuvable");
  const produit = await repo.produitParId(produitId);
  if (!produit) throw new ErreurMetier(404, "Produit introuvable");
  if (produit.disponible === false) {
    throw new ErreurMetier(409, `Le produit « ${produit.nom} » est indisponible`);
  }
  return produit;
}

// ---------- Mise en forme du panier (relue et recalculée à chaque consultation) ----------

function vueLigne(ligne, produitsParId, menusParId) {
  const alertes = [];
  const choixIds = tableauVersChoix(ligne.choix);
  let nom;
  let image;
  let disponible = true;
  let prix = ligne.prixUnitaireMillimes;
  let choixDetail = [];
  let refId;

  if (ligne.type === "produit") {
    refId = ligne.produit;
    const p = produitsParId.get(String(ligne.produit));
    if (!p) {
      nom = "Produit supprimé";
      image = imageProduit(null);
      disponible = false;
      alertes.push({ type: "indisponible", message: "Ce produit n'existe plus." });
    } else {
      nom = p.nom;
      image = imageProduit(p.image);
      prix = p.prixMillimes;
      if (p.disponible === false) {
        disponible = false;
        alertes.push({ type: "indisponible", message: `« ${p.nom} » est devenu indisponible.` });
      }
    }
  } else {
    refId = ligne.menu;
    const m = menusParId.get(String(ligne.menu));
    if (!m) {
      nom = "Menu supprimé";
      image = imageMenu(null);
      disponible = false;
      alertes.push({ type: "indisponible", message: "Ce menu n'existe plus." });
    } else {
      nom = m.nom;
      image = imageMenu(m.image);
      const statut = getEffectiveAvailability(m);
      if (!statut.disponible) {
        disponible = false;
        alertes.push({ type: "indisponible", message: `« ${m.nom} » est indisponible (${statut.raison}).` });
      }
      try {
        prix = enMillimes(computeMenuComposePrice(m, choixIds).total);
      } catch (err) {
        if (!(err instanceof MenuChoiceError)) throw err;
        // Le menu a été modifié par l'agent : les choix enregistrés ne sont plus valides.
        disponible = false;
        alertes.push({ type: "indisponible", message: "Ce menu a changé : modifiez vos choix." });
      }
      // Noms des options choisies, et option devenue indisponible.
      choixDetail = m.groupes
        .filter((g) => (choixIds[idDe(g._id)] || []).length > 0)
        .map((g) => ({
          groupeId: idDe(g._id),
          libelle: g.libelle,
          options: choixIds[idDe(g._id)].map((produitId) => {
            const option = g.options.find((o) => idDe(o.produit) === produitId);
            const produit = option && option.produit;
            if (disponible && (!produit || produit.disponible === false)) {
              disponible = false;
              alertes.push({
                type: "indisponible",
                message: `L'option « ${produit ? produit.nom : "supprimée"} » est indisponible.`,
              });
            }
            return { produitId, nom: produit ? produit.nom : "Option supprimée" };
          }),
        }));
    }
  }

  if (disponible && prix !== ligne.prixUnitaireMillimes) {
    alertes.push({
      type: "prix_modifie",
      message: `Le prix a changé : ${formaterTnd(ligne.prixUnitaireMillimes)} → ${formaterTnd(prix)} TND.`,
    });
  }

  return {
    _id: ligne._id,
    type: ligne.type,
    refId,
    nom,
    image,
    quantite: ligne.quantite,
    choix: choixDetail,
    choixIds,
    prixUnitaire: prix / 1000,
    totalLigne: (prix * ligne.quantite) / 1000,
    disponible,
    alertes,
  };
}

async function vuePanier(panier) {
  const lignes = panier ? panier.lignes : [];
  const idsProduits = lignes.filter((l) => l.type === "produit").map((l) => l.produit);
  const idsMenus = lignes.filter((l) => l.type === "menu").map((l) => l.menu);

  const [produits, menus] = await Promise.all([
    idsProduits.length ? repo.produitsParIds(idsProduits) : [],
    idsMenus.length ? repo.menusParIds(idsMenus) : [],
  ]);
  const produitsParId = new Map(produits.map((p) => [String(p._id), p]));
  const menusParId = new Map(menus.map((m) => [String(m._id), m]));

  const vues = lignes.map((l) => vueLigne(l, produitsParId, menusParId));

  // Le total ne compte que ce qui est commandable : une ligne indisponible est signalée, pas facturée.
  const totalMillimes = vues
    .filter((v) => v.disponible)
    .reduce((somme, v) => somme + enMillimes(v.totalLigne), 0);

  return {
    lignes: vues,
    nombreArticles: vues.reduce((n, v) => n + v.quantite, 0),
    total: totalMillimes / 1000,
  };
}

// ---------- Opérations (US11 et US12) ----------

// GET /api/panier
async function lirePanier(clientId) {
  return vuePanier(await repo.trouverParClient(clientId));
}

// POST /api/panier/lignes : { type: "produit", produitId, quantite? }
//                        ou { type: "menu", menuId, choix: { groupeId: [produitId] }, quantite? }
async function ajouterLigne(clientId, { type, produitId, menuId, choix = {}, quantite = 1 }) {
  let prix;
  let existante;
  const panier = await repo.trouverOuCreer(clientId);

  if (type === "produit") {
    const produit = await preparerProduit(produitId);
    prix = produit.prixMillimes;
    existante = panier.lignes.find((l) => l.type === "produit" && String(l.produit) === String(produit._id));
    if (!existante) {
      panier.lignes.push({ type, produit: produit._id, quantite, prixUnitaireMillimes: prix });
    }
  } else {
    prix = await preparerMenu(menuId, choix);
    const tableau = choixVersTableau(choix);
    existante = panier.lignes.find(
      (l) => l.type === "menu" && String(l.menu) === String(menuId) && signature(l.choix) === signature(tableau)
    );
    if (!existante) {
      panier.lignes.push({ type, menu: menuId, choix: tableau, quantite, prixUnitaireMillimes: prix });
    }
  }

  // Même article déjà dans le panier : on augmente la quantité de la ligne existante.
  if (existante) {
    const total = existante.quantite + quantite;
    if (total > QUANTITE_MAX) {
      throw new ErreurMetier(
        400,
        `Quantité maximale : ${QUANTITE_MAX} par ligne (déjà ${existante.quantite} dans le panier)`
      );
    }
    existante.quantite = total;
    existante.prixUnitaireMillimes = prix;
  }

  await panier.save();
  return vuePanier(panier);
}

// Prix actuel d'une ligne, ou null si elle n'est plus commandable.
async function prixCourant(ligne) {
  if (ligne.type === "produit") {
    const p = await repo.produitParId(ligne.produit);
    return p && p.disponible !== false ? p.prixMillimes : null;
  }
  try {
    return await preparerMenu(ligne.menu, tableauVersChoix(ligne.choix));
  } catch (err) {
    if (err instanceof ErreurMetier) return null;
    throw err;
  }
}

// PATCH /api/panier/lignes/:id : { quantite?, choix? }. quantite 0 = supprimer la ligne.
async function modifierLigne(clientId, ligneId, { quantite, choix }) {
  if (!mongoose.isValidObjectId(ligneId)) throw new ErreurMetier(404, "Ligne introuvable");
  const panier = await repo.trouverOuCreer(clientId);
  // Cherche uniquement dans le panier du client connecté : on ne peut pas toucher à celui d'un autre.
  const ligne = panier.lignes.id(ligneId);
  if (!ligne) throw new ErreurMetier(404, "Ligne introuvable");

  if (quantite === 0) {
    panier.lignes.pull(ligne._id);
  } else {
    if (choix !== undefined) {
      if (ligne.type !== "menu") {
        throw new ErreurMetier(400, "Seul un menu composé a des choix à modifier");
      }
      // Mêmes règles min/max qu'à l'ajout.
      ligne.prixUnitaireMillimes = await preparerMenu(ligne.menu, choix);
      ligne.choix = choixVersTableau(choix);
        } else {
      // Le client a vu la ligne : on enregistre le prix actuel (efface l'alerte « prix modifié »).
      const prix = await prixCourant(ligne);
      // Article indisponible : on ne change plus sa quantité, on peut seulement le supprimer.
      if (prix === null && quantite !== undefined) {
        throw new ErreurMetier(409, "Cet article est indisponible : vous pouvez seulement le supprimer");
      }
      if (prix !== null) ligne.prixUnitaireMillimes = prix;
    }
    if (quantite !== undefined) ligne.quantite = quantite;
  }

  await panier.save();
  return vuePanier(panier);
}

// DELETE /api/panier/lignes/:id
async function supprimerLigne(clientId, ligneId) {
  if (!mongoose.isValidObjectId(ligneId)) throw new ErreurMetier(404, "Ligne introuvable");
  const panier = await repo.trouverOuCreer(clientId);
  if (!panier.lignes.id(ligneId)) throw new ErreurMetier(404, "Ligne introuvable");
  panier.lignes.pull(ligneId);
  await panier.save();
  return vuePanier(panier);
}

// DELETE /api/panier
async function viderPanier(clientId) {
  const panier = await repo.trouverOuCreer(clientId);
  panier.lignes = [];
  await panier.save();
  return vuePanier(panier);
}

module.exports = { QUANTITE_MAX, lirePanier, ajouterLigne, modifierLigne, supprimerLigne, viderPanier };
