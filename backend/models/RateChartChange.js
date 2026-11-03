
const mongoose = require('mongoose')

const rateChartChangeSchema = new mongoose.Schema(
  {
    country: {
      type: String,
      default: 'India',
      required: true,
    },

    state: {
      type: String,
      required: true,
      trim: true,
    },

    federationName: {
      type: String,
      required: true,
      trim: true,
    },

    chartName: {
      type: String,
      required: true,
      trim: true,
    },

    chartType: {
      type: String,
      enum: ['federation', 'government_reference'],
      required: true,
    },

    animalType: {
      type: String,
      enum: ['Cow', 'Buffalo', 'Goat', 'Other'],
      required: true,
    },

    rateMatrix: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    sourceName: {
      type: String,
      required: true,
      trim: true,
    },

    sourceUrl: {
      type: String,
      default: '',
    },

    sourceHash: {
      type: String,
      required: true,
    },

    effectiveFrom: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },

    detectedAt: {
      type: Date,
      default: Date.now,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    rejectionReason: {
      type: String,
      default: '',
    },

    approvedChartId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RateChart',
      default: null,
    },
  },
  { timestamps: true }
)

// Same source content should not create duplicate pending records.
rateChartChangeSchema.index(
  { sourceName: 1, sourceHash: 1 },
  { unique: true }
)

module.exports = mongoose.model(
  'RateChartChange',
  rateChartChangeSchema
)
