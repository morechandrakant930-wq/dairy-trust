const mongoose = require('mongoose')

const farmerSchema = new mongoose.Schema(
  {
    farmerId: { type: String, required: true, trim: true },
    dairyId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    mobileNumber: { type: String, required: true, trim: true },
    village: { type: String, required: true, trim: true },
    animalType: {
      type: String,
      enum: ['Cow', 'Buffalo', 'Goat', 'Other'],
      default: 'Cow',
      required: true,
    },
    passwordHash: { type: String, required: true },
    mustChangePassword: { type: Boolean, default: true },
    role: { type: String, default: 'farmer', immutable: true },

    // Approved payment preference
    paymentMode: {
      type: String,
      enum: ['cash', 'auto', 'upi'],
      default: 'cash',
    },

    // Bank and UPI details - never expose these in public farmer lists
    bankDetails: {
      accountHolderName: { type: String, trim: true, default: '' },
      accountNumber: { type: String, trim: true, default: '' },
      ifscCode: { type: String, trim: true, uppercase: true, default: '' },
      bankName: { type: String, trim: true, default: '' },
      upiId: { type: String, trim: true, lowercase: true, default: '' },
    },

    // Farmer requested payment mode (Owner approval required)
    paymentModeRequest: {
      mode: {
        type: String,
        enum: ['cash', 'auto', 'upi'],
        default: null,
      },
      status: {
        type: String,
        enum: ['none', 'pending', 'approved', 'rejected'],
        default: 'none',
      },
      requestedAt: { type: Date, default: null },
      reviewedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
)

farmerSchema.index({ dairyId: 1, farmerId: 1 }, { unique: true })

module.exports = mongoose.model('Farmer', farmerSchema)
