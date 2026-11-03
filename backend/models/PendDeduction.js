const mongoose = require('mongoose')

const pendDeductionSchema = new mongoose.Schema(
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

    // Milk payment and bonus breakup
    milkPayment: {
      type: Number,
      required: true,
      min: 0,
    },

    qualityBonus: {
      type: Number,
      default: 0,
      min: 0,
    },

    manualBonus: {
      type: Number,
      default: 0,
      min: 0,
    },

    grossPayment: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Pend deduction
    previousPendBalance: {
      type: Number,
      required: true,
      min: 0,
    },

    deductionAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    remainingPendBalance: {
      type: Number,
      required: true,
      min: 0,
    },

    // Loan deduction
    loanDeductionAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    remainingLoanBalance: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Final settlement
    finalPayable: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentMode: {
      type: String,
      enum: ['cash', 'auto', 'upi'],
      default: 'cash',
    },

    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'processing', 'failed'],
      default: 'pending',
    },

    reportStartDate: {
      type: Date,
      required: true,
    },

    reportEndDate: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ['confirmed'],
      default: 'confirmed',
    },

    confirmedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
)

pendDeductionSchema.index(
  {
    dairyId: 1,
    farmerId: 1,
    reportStartDate: 1,
    reportEndDate: 1,
  },
  { unique: true }
)

module.exports = mongoose.model(
  'PendDeduction',
  pendDeductionSchema
)
