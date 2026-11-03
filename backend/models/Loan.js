
const mongoose = require('mongoose')

const loanSchema = new mongoose.Schema(
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

    loanAmount: {
      type: Number,
      required: true,
      min: 1,
    },

    remainingBalance: {
      type: Number,
      required: true,
      min: 0,
    },

    loanDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
)

loanSchema.index({ dairyId: 1, farmerId: 1, loanDate: -1 })

module.exports = mongoose.model('Loan', loanSchema)
