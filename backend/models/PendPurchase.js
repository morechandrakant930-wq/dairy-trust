
const mongoose = require('mongoose')

const pendPurchaseSchema = new mongoose.Schema(
  {
    dairyId: {
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

    purchasePricePerBag: {
      type: Number,
      required: true,
      min: 0,
    },

    totalPurchaseAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    purchaseDate: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model(
  'PendPurchase',
  pendPurchaseSchema
)
