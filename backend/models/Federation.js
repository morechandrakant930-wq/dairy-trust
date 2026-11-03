
const mongoose = require('mongoose');

const federationSchema = new mongoose.Schema(
  {
    federationName: {
      type: String,
      required: true,
      trim: true
    },
    state: {
      type: String,
      required: true,
      trim: true
    },
    country: {
      type: String,
      default: 'India'
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

federationSchema.index(
  { state: 1, federationName: 1 },
  { unique: true }
);

module.exports = mongoose.model('Federation', federationSchema);
