const mongoose = require('mongoose')

const milkRateSchema = new mongoose.Schema(
  {
    dairyId: {
      type: String,
      required: true,
    },

    cowRate: {
      type: Number,
      required: true,
      min: 0,
      default: 36,
    },

    buffaloRate: {
      type: Number,
      required: true,
      min: 0,
      default: 50,
    },

    goatRate: {
      type: Number,
      required: true,
      min: 0,
      default: 45,
    },

    otherRate: {
      type: Number,
      required: true,
      min: 0,
      default: 30,
    },
  },
  {
    timestamps: true,
  }
)

milkRateSchema.index({ dairyId: 1 }, { unique: true })

module.exports = mongoose.model('MilkRate', milkRateSchema)