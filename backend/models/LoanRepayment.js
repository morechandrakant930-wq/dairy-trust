
const mongoose = require('mongoose')

const loanRepaymentSchema = new mongoose.Schema(
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

    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    reportStartDate: {
      type: Date,
      required: true,
    },

    reportEndDate: {
      type: Date,
      required: true,
    },

    confirmedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
)

loanRepaymentSchema.index(
  {
    dairyId: 1,
    farmerId: 1,
    reportStartDate: 1,
    reportEndDate: 1,
  },
  { unique: true }
)

module.exports = mongoose.model('LoanRepayment', loanRepaymentSchema)
