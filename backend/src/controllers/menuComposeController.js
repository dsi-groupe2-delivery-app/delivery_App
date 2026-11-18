const fs = require('fs');
const path = require('path');
const MenuCompose = require('../models/MenuCompose');
const Product = require('../models/Product');
const { validateMenuStructure, findSingleOptionGroups } = require('../validators/menuComposeValidation');
const { normalizeMenuBody, OBJECT_ID } = require('../validators/menuComposeForm');
const { getEffectiveAvailability, getProduitsIndisponibles } = require('../utils/availability');
const BASE = '/admin/menus-composes';
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
function setFlash(req, type, message) {
  if (req.session) req.session.flash = { type, message };
}
function notFound(res) {
  return res.status(404).render('errors/404', { message: 'Menu composé introuvable' });
}
const loadProduits = () => Product.find().sort({ nom: 1 }).select('nom disponible').lean();
async function validateAll(data, excludeId) {
  const errors = validateMenuStructure(data);

  if (!errors.nom && data.nom) {
    const filter = { nom: new RegExp(`^${escapeRegex(data.nom)}$`, 'i') };
    if (excludeId) filter._id = { $ne: excludeId }; // US09 : ignore le menu en cours d'édition
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
  } catch (e) {    next(e);
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
      removeFile(req.file); // erreur : rien n'est créé
      return renderForm(res, { status: 422, values: data, errors });
    }
    await MenuCompose.create({ ...data, image: req.file ? `/uploads/menus/${req.file.filename}` : undefined });
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
