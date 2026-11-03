const mongoose = require('mongoose')

const rateChartSelectionSchema = new mongoose.Schema(
  {
    dairyId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    country: {
      type: String,
      default: 'India',
      trim: true,
    },

    state: {
      type: String,
      required: true,
      trim: true,
    },

    federation: {
      type: String,
      required: true,
      trim: true,
    },

    animalType: {
      type: String,
      enum: ['Cow', 'Buffalo', 'Goat', 'Other'],
      required: true,
    },

    chartId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RateChart',
      required: true,
    },

    chartName: {
      type: String,
      required: true,
      trim: true,
    },

    chartSource: {
      type: String,
      required: true,
      trim: true,
    },

    verificationStatus: {
      type: String,
      enum: ['verified', 'pending'],
      default: 'verified',
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
)

// One active selection per dairy per animal type
rateChartSelectionSchema.index(
  { dairyId: 1, animalType: 1 },
  { unique: true }
)

module.exports = mongoose.model(
  'RateChartSelection',
  rateChartSelectionSchema
)