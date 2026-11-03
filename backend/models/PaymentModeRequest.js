
const mongoose = require('mongoose')

const paymentModeRequestSchema = new mongoose.Schema(
  {
    dairyId: { type: String, required: true, index: true },
    farmerId: { type: String, required: true, index: true },

    requestedMode: {
      type: String,
      enum: ['cash', 'auto'],
      required: true,
    },

    bankDetails: {
      accountHolderName: { type: String, trim: true, default: '' },
      accountNumber: { type: String, trim: true, default: '' },
      ifscCode: { type: String, trim: true, uppercase: true, default: '' },
      bankName: { type: String, trim: true, default: '' },
    },

    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },

    reviewedAt: { type: Date, default: null },
    reviewNote: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
)

paymentModeRequestSchema.index({
  dairyId: 1,
  farmerId: 1,
  status: 1,
})

module.exports = mongoose.model(
  'PaymentModeRequest',
  paymentModeRequestSchema
)
