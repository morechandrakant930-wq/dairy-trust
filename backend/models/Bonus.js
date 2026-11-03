
const mongoose = require('mongoose');

const bonusSchema = new mongoose.Schema(
  {
    dairyId: {
      type: String,
      required: true,
      index: true,
    },

    farmerId: {
      type: String,
      required: true,
      index: true,
    },

    bonusType: {
      type: String,
      enum: ['manual', 'quality'],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    reason: {
      type: String,
      trim: true,
      default: '',
    },

    bonusDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    // 10-day settlement period
    reportStartDate: {
      type: Date,
      default: null,
    },

    reportEndDate: {
      type: Date,
      default: null,
    },

    // Quality bonus details
    fat: {
      type: Number,
      min: 0,
      default: null,
    },

    snf: {
      type: Number,
      min: 0,
      default: null,
    },

    ratePerLitre: {
      type: Number,
      min: 0,
      default: null,
    },

    milkQuantity: {
      type: Number,
      min: 0,
      default: null,
    },

    status: {
      type: String,
      enum: ['pending', 'approved', 'included'],
      default: 'approved',
    },
  },
  { timestamps: true }
);

bonusSchema.index({
  dairyId: 1,
  farmerId: 1,
  bonusDate: -1,
});

module.exports = mongoose.model('Bonus', bonusSchema);
