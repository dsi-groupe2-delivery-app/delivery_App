const fs = require('fs');
const path = require('path');
const MenuCompose = require('../models/MenuCompose');
const Product = require('../models/Product');
const { validateMenuStructure, findSingleOptionGroups } = require('../validators/menuComposeValidation');
const { normalizeMenuBody, OBJECT_ID } = require('../validators/menuComposeForm');
const { getEffectiveAvailability, getProduitsIndisponibles } = require('../utils/availability');
const BASE = '/admin/menus-composes';
const EMPTY_VALUES = () => ({
  nom: '',
  description: '',
  prixBase: '',
  disponible: true,
  image: null,
  groupes: [{ libelle: '', min: 1, max: 1, options: [{ produit: '', supplement: 0 }] }],
});
function removeFile(file) {
  if (file && file.path) fs.unlink(file.path, () => {});
}
function removeImageByUrl(url) {
  if (!url || !String(url).startsWith('/uploads/menus/')) return;
  const fichier = path.join(__dirname, '..', 'public', 'uploads', 'menus', path.basename(url));
  fs.unlink(fichier, () => {});
}
function notFound(res) {
  res.status(404).send('Menu introuvable');
}
function setFlash(req, type, message) {
  if (req.session) req.session.flash = { type, message };
}
const loadProduits = () => Product.find().sort({ nom: 1 }).select('nom disponible').lean();
async function validateAll(data, excludeId) {
  const errors = validateMenuStructure(data);

  if (!errors.nom && data.nom) {
    const filter = { nomMinuscule: data.nom.toLowerCase() };
    if (excludeId) filter._id = { $ne: excludeId };
    if (await MenuCompose.exists(filter)) errors.nom = 'Ce nom de menu existe déjà';
  }

  const ids = [...new Set(data.groupes.flatMap((g) => g.options.map((o) => o.produit)).filter(Boolean))];
  const found = new Set((await Product.find({ _id: { $in: ids } }).select('_id').lean()).map((p) => String(p._id)));
  data.groupes.forEach((g, i) =>
    g.options.forEach((o, j) => {
      if (o.produit && !found.has(o.produit)) {
        errors.groupes = errors.groupes || {};
        errors.groupes[i] = errors.groupes[i] || {};
        errors.groupes[i].items = errors.groupes[i].items || {};
        errors.groupes[i].items[j] = 'Produit introuvable';
      }
    })
  );
  return errors;
}
async function renderForm(res, { status = 200, isEdit = false, menuId = null, values, errors = {} }) {
  const produits = await loadProduits();
  const byId = new Map(produits.map((p) => [String(p._id), p]));
  const titre = isEdit ? `Modifier : ${values.nom || 'menu composé'}` : 'Nouveau menu composé';
  res.status(status).render('form', {
    title: titre,
    titre,
    isEdit,
    menuId,
    values,
    errors,
    produits,
    produitsIndisponibles: getProduitsIndisponibles(values.groupes, byId),
    singleOptionGroups: findSingleOptionGroups(values.groupes),
  });
}
exports.list = async (req, res, next) => {
  try {
    const menus = await MenuCompose.find()
      .sort({ nom: 1 })
      .populate('groupes.options.produit', 'nom disponible')
      .lean();
    const rows = menus.map((m) => ({
      ...m,
      groupes: [...m.groupes].sort((a, b) => a.ordre - b.ordre),
      statut: getEffectiveAvailability(m),
    }));
    const flash = req.session && req.session.flash;
    if (req.session) delete req.session.flash;
    res.render('index', { title: 'Menus composés', titre: 'Menus composés', menus: rows, flash });
  } catch (e) {
    next(e);
  }
};
exports.newForm = async (req, res, next) => {
  try {
    await renderForm(res, { values: EMPTY_VALUES() });
  } catch (e) {
    next(e);
  }
};
exports.create = async (req, res, next) => {
  try {
    const data = normalizeMenuBody(req.body);
    const errors = await validateAll(data);
    if (req.uploadError) errors.image = req.uploadError;
    if (Object.keys(errors).length) {
      removeFile(req.file);
      return renderForm(res, { status: 422, values: data, errors });
    }
    await MenuCompose.create({
      ...data,
      nomMinuscule: data.nom.toLowerCase(),
      image: req.file ? `/uploads/menus/${req.file.filename}` : undefined,
    });
    setFlash(req, 'success', 'Menu composé créé avec succès.');
    res.redirect(BASE);
  } catch (e) {
    removeFile(req.file);
    if (e.code === 11000) {
      return renderForm(res, {
        status: 422,
        values: normalizeMenuBody(req.body),
        errors: { nom: 'Ce nom de menu existe déjà' },
      });
    }
    next(e);
  }
};
function menuToValues(menu) {
  const m = menu.toObject ? menu.toObject() : menu;
  return {
    nom: m.nom,
    description: m.description || '',
    prixBase: m.prixBase,
    disponible: m.disponible,
    image: m.image || null,
    groupes: [...m.groupes]
      .sort((a, b) => a.ordre - b.ordre)
      .map((g) => ({
        _id: String(g._id),
        libelle: g.libelle,
        min: g.min,
        max: g.max,
        options: g.options.map((o) => ({ produit: String(o.produit), supplement: o.supplement })),
      })),
  };
}
exports.editForm = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!OBJECT_ID.test(id)) return notFound(res);
    const menu = await MenuCompose.findById(id);
    if (!menu) return notFound(res);
    await renderForm(res, { isEdit: true, menuId: id, values: menuToValues(menu) });
  } catch (e) {
    next(e);
  }
};
exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!OBJECT_ID.test(id)) return notFound(res);
    const menu = await MenuCompose.findById(id);
    if (!menu) return notFound(res);

    const data = normalizeMenuBody(req.body);
    const known = new Set(menu.groupes.map((g) => String(g._id)));
    data.groupes.forEach((g) => {
      if (g._id && !known.has(g._id)) delete g._id;
    });
    const errors = await validateAll(data, id);
    if (req.uploadError) errors.image = req.uploadError;
    if (Object.keys(errors).length) {
      removeFile(req.file);
      return renderForm(res, {
        status: 422,
        isEdit: true,
        menuId: id,
        values: { ...data, image: menu.image || null },
        errors,
      });
    }
    const oldImage = menu.image;
    menu.set({
      nom: data.nom,
      nomMinuscule: data.nom.toLowerCase(),
      description: data.description,
      prixBase: data.prixBase,
      disponible: data.disponible,
      groupes: data.groupes,
    });
    if (req.file) menu.image = `/uploads/menus/${req.file.filename}`;
    await menu.save();
    if (req.file) removeImageByUrl(oldImage);

    setFlash(req, 'success', 'Menu composé modifié avec succès.');
    res.redirect(BASE);
  } catch (e) {
    removeFile(req.file);
    if (e.code === 11000) {
      return renderForm(res, {
        status: 422,
        isEdit: true,
        menuId: req.params.id,
        values: normalizeMenuBody(req.body),
        errors: { nom: 'Ce nom de menu existe déjà' },
      });
    }
    next(e);
  }
};