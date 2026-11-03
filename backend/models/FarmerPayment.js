const mongoose = require('mongoose')

const farmerPaymentSchema = new mongoose.Schema(
  {
    dairyId: { type: String, required: true, index: true },
    farmerId: { type: String, required: true, index: true },

    settlementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PendDeduction',
      required: true,
      unique: true,
    },

    grossPayment: { type: Number, required: true, min: 0 },
    pendDeduction: { type: Number, default: 0, min: 0 },
    loanDeduction: { type: Number, default: 0, min: 0 },
    finalPayable: { type: Number, required: true, min: 0 },

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

    paidAt: { type: Date, default: null },
    paymentReference: { type: String, default: '' }, // UTR or receipt reference

    // YouPI-PG Gateway Specific Fields
    utr: { type: String, trim: true, default: '' },
    gatewaySessionId: { type: String, trim: true, default: '' },
    upiVpa: { type: String, trim: true, default: '' },
    gatewayStatus: {
      type: String,
      enum: ['NONE', 'PENDING', 'OBSERVED_SUCCESS', 'RECONCILED', 'FAILED'],
      default: 'NONE',
    },
    paymentNotes: { type: String, default: '' },
  },
  { timestamps: true }
)

module.exports = mongoose.model('FarmerPayment', farmerPaymentSchema)
