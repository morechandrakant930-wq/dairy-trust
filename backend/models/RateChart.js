const mongoose = require('mongoose');

const rateChartSchema = new mongoose.Schema(
  {
    dairyId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    chartName: {
      type: String,
      required: true,
      trim: true,
    },

    chartType: {
      type: String,
      enum: ['manual'],
      default: 'manual',
    },

    animalType: {
      type: String,
      enum: ['Cow', 'Buffalo', 'Goat', 'Other'],
      required: true,
    },

    rateMatrix: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: {},
    },

    fatValues: {
      type: [Number],
      default: [],
    },

    snfValues: {
      type: [Number],
      default: [],
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    version: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

// One active manual chart per dairy and animal type.
// Historical charts are retained as inactive records.
rateChartSchema.index(
  { dairyId: 1, animalType: 1, isActive: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
);

module.exports = mongoose.model('RateChart', rateChartSchema);