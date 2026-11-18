const mongoose = require('mongoose');
const { validateMenuStructure } = require('../validators/menuComposeValidation');
const optionSchema = new mongoose.Schema(
  {
    produit: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    supplement: { type: Number, default: 0, min: 0 }, 
  },
  { _id: false }
);
const groupeSchema = new mongoose.Schema({
  libelle: { type: String, required: true, trim: true, maxlength: 60 },
  min: { type: Number, required: true, min: 0 },
  max: { type: Number, required: true, min: 1 },
  ordre: { type: Number, default: 0 }, 
  options: {
    type: [optionSchema],
    validate: [(v) => v.length >= 1, 'Un groupe doit contenir au moins 1 option'],
  },
});
const menuComposeSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 500 },
    prixBase: { type: Number, required: true, min: 0.001 },
    image: { type: String },
    disponible: { type: Boolean, default: true },
    groupes: {
      type: [groupeSchema],
      validate: [(v) => v.length >= 1, 'Un menu composé doit contenir au moins 1 groupe'],
    },
  },
  { timestamps: true }
);
menuComposeSchema.index({ nom: 1 }, { unique: true, collation: { locale: 'fr', strength: 2 } });
menuComposeSchema.pre('validate', function () {
  const errors = validateMenuStructure(this.toObject());
  if (Object.keys(errors).length) {
    const err = new mongoose.Error.ValidationError(this);
    err.message = 'Menu composé invalide';
    err.details = errors;
    throw err;
  }
});
module.exports = mongoose.models.MenuCompose || mongoose.model('MenuCompose', menuComposeSchema);
