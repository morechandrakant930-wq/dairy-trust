
const mongoose = require('mongoose');

const milkCollectionSchema = new mongoose.Schema(
  {
    farmerId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    dairyId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    animalType: {
      type: String,
      required: true,
      enum: ['Cow', 'Buffalo', 'Goat', 'Other'],
    },

    quantity: {
      type: Number,
      required: true,
      min: 0.01,
    },

    fat: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    snf: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    ratePerLitre: {
      type: Number,
      required: true,
      min: 0,
    },

    totalPayment: {
      type: Number,
      required: true,
      min: 0,
    },

    rateChartSnapshot: {
      chartId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RateChart',
        default: null,
      },
      chartName: {
        type: String,
        default: '',
      },
      state: {
        type: String,
        default: '',
      },
      federation: {
        type: String,
        default: '',
      },
      version: {
        type: Number,
        default: null,
      },
    },

    // Payment tracking
    paymentStatus: {
      type: String,
      enum: ['pending', 'processing', 'paid'],
      default: 'pending',
      index: true,
    },

    paymentCycleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentCycle',
      default: null,
    },

    paymentDate: {
      type: Date,
      default: null,
    },

    paymentReference: {
      type: String,
      default: '',
      trim: true,
    },

    collectionTime: {
      type: Date,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Useful indexes for farmer reports and payment calculations
milkCollectionSchema.index({
  dairyId: 1,
  farmerId: 1,
  collectionTime: -1,
});

milkCollectionSchema.index({
  dairyId: 1,
  paymentStatus: 1,
  collectionTime: 1,
});

module.exports = mongoose.model('MilkCollection', milkCollectionSchema);
