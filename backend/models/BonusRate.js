
const mongoose = require('mongoose');

const bonusRateSchema = new mongoose.Schema(
  {
    dairyId: {
      type: String,
      required: true,
      index: true,
    },

    animalType: {
      type: String,
      enum: ['Cow', 'Buffalo', 'Goat', 'Other'],
      required: true,
    },

    fat: {
      type: Number,
      required: true,
      min: 0,
    },

    snf: {
      type: Number,
      required: true,
      min: 0,
    },

    bonusPerLitre: {
      type: Number,
      required: true,
      min: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

bonusRateSchema.index(
  { dairyId: 1, animalType: 1, fat: 1, snf: 1 },
  { unique: true }
);

module.exports = mongoose.model('BonusRate', bonusRateSchema);
