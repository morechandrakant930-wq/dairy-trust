
const mongoose = require('mongoose')

const pendSaleSchema = new mongoose.Schema(
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

    pendName: {
      type: String,
      required: true,
      trim: true,
    },

    quantityBags: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: 'Quantity must be a whole number of bags',
      },
    },

    salePricePerBag: {
      type: Number,
      required: true,
      min: 0,
    },

    totalSaleAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    saleDate: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model(
  'PendSale',
  pendSaleSchema
)
