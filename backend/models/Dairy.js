
const mongoose = require('mongoose')

const dairySchema = new mongoose.Schema(
  {
    dairyId: {
      type: String,
      required: true,
      unique: true,
      default: () => `DT-${new mongoose.Types.ObjectId().toString()}`,
    },

    dairyName: {
      type: String,
      required: true,
      trim: true,
    },

    ownerName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      required: true,
    },

    plan: {
      type: String,
      enum: ['basic', 'standard', 'premium'],
      default: 'basic',
      required: true,
    },

    role: {
      type: String,
      default: 'dairyOwner',
      immutable: true,
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Dairy', dairySchema)
