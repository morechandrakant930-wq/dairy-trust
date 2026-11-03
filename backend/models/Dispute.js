
const mongoose = require('mongoose')

const disputeSchema = new mongoose.Schema(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Farmer',
      required: true,
      index: true,
    },

    farmerId: {
      type: String,
      required: true,
      trim: true,
    },

    farmerName: {
      type: String,
      required: true,
      trim: true,
    },

    dairyId: {
      type: String,
      required: true,
      index: true,
    },

    issueType: {
      type: String,
      required: true,
      trim: true,
    },

    collectionDate: {
      type: Date,
      required: true,
    },

    session: {
      type: String,
      enum: ['Morning', 'Evening'],
      required: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ['Pending', 'Under Review', 'Resolved', 'Rejected'],
      default: 'Pending',
      index: true,
    },

    ownerReply: {
      type: String,
      default: '',
      trim: true,
    },

    resolution: {
      type: String,
      default: '',
      trim: true,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
)

disputeSchema.index({ dairyId: 1, createdAt: -1 })
disputeSchema.index({ farmer: 1, createdAt: -1 })

module.exports = mongoose.model('Dispute', disputeSchema)
