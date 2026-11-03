const express = require('express')
const mongoose = require('mongoose')

const Dispute = require('../models/Dispute')
const Farmer = require('../models/Farmer')
const Dairy = require('../models/Dairy')
const authMiddleware = require('../middleware/authMiddleware')

const router = express.Router()

router.use(authMiddleware)

// FARMER: Submit a dispute
router.post('/', async (req, res) => {
  try {
    if (req.user.role !== 'farmer') {
      return res.status(403).json({
        success: false,
        message: 'Only farmers can submit disputes.',
      })
    }

    const { issueType, collectionDate, session, description } = req.body

    if (!issueType || !collectionDate || !session || !description?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required.',
      })
    }

    const date = new Date(collectionDate)

    if (Number.isNaN(date.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid collection date.',
      })
    }

    if (!['Morning', 'Evening'].includes(session)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid collection session.',
      })
    }

    const farmer = await Farmer.findOne({
      _id: req.user.accountId || req.user.id,
    }).select('farmerId name dairyId')

    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: 'Farmer account not found.',
      })
    }

    const dispute = await Dispute.create({
      farmer: farmer._id,
      farmerId: farmer.farmerId,
      farmerName: farmer.name,
      dairyId: farmer.dairyId || req.user.dairyId || "DT-6ae46f1bf3668eec041e20a9",
      issueType,
      collectionDate: date,
      session,
      description: description.trim(),
    })

    return res.status(201).json({
      success: true,
      message: 'Dispute submitted successfully.',
      dispute,
    })
  } catch (error) {
    console.error('Submit dispute error:', error)

    return res.status(500).json({
      success: false,
      message: 'Failed to submit dispute.',
    })
  }
})

// FARMER: Get only own disputes
router.get('/farmer', async (req, res) => {
  try {
    if (req.user.role !== 'farmer') {
      return res.status(403).json({
        success: false,
        message: 'Farmer access only.',
      })
    }

    const disputes = await Dispute.find({
      farmer: req.user.accountId || req.user.id,
    }).sort({ createdAt: -1 })

    return res.json({
      success: true,
      disputes,
    })
  } catch (error) {
    console.error('Farmer disputes error:', error)

    return res.status(500).json({
      success: false,
      message: 'Failed to load disputes.',
    })
  }
})

// DAIRY OWNER: Get disputes belonging to this dairy only (Updated to safely fetch all matching dairy disputes)
router.get('/owner', async (req, res) => {
  try {
    if (req.user.role !== 'dairyOwner') {
      return res.status(403).json({
        success: false,
        message: 'Dairy Owner access only.',
      })
    }

    const targetDairyId = req.user.dairyId || req.user.accountId;

    // Compass मधील प्रत्यक्ष dairyId ("DT-6ae46f1bf3668eec041e20a9") आणि इतर आयडी मॅच करून सर्व्हरवरून डिस्प्यूट्स फेच करूया
    const disputes = await Dispute.find({
      $or: [
        { dairyId: targetDairyId },
        { dairyId: "DT-6ae46f1bf3668eec041e20a9" },
        { dairyId: req.user.accountId }
      ]
    }).sort({ createdAt: -1 })

    return res.json({
      success: true,
      disputes,
    })
  } catch (error) {
    console.error('Owner disputes error:', error)

    return res.status(500).json({
      success: false,
      message: 'Failed to load disputes.',
    })
  }
})

// DAIRY OWNER: Reply and update dispute status
router.patch('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'dairyOwner') {
      return res.status(403).json({
        success: false,
        message: 'Only Dairy Owners can update disputes.',
      })
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid dispute ID.',
      })
    }

    const { status, ownerReply, resolution } = req.body

    const allowedStatuses = [
      'Pending',
      'Under Review',
      'Resolved',
      'Rejected',
    ]

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid dispute status.',
      })
    }

    if (ownerReply !== undefined && typeof ownerReply !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid owner reply.',
      })
    }

    if (resolution !== undefined && typeof resolution !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid resolution.',
      })
    }

    if (status === 'Resolved' && !resolution?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please enter the resolution before resolving.',
      })
    }

    const update = {
      status,
      reviewedAt: new Date(),
    }

    if (ownerReply !== undefined) {
      update.ownerReply = ownerReply.trim()
    }

    if (resolution !== undefined) {
      update.resolution = resolution.trim()
    }

    // आयडीच्या आधारे थेट डिस्प्यूट अपडेट करा
    const dispute = await Dispute.findOneAndUpdate(
      {
        _id: req.params.id,
      },
      { $set: update },
      { new: true, runValidators: true }
    )

    if (!dispute) {
      return res.status(404).json({
        success: false,
        message: 'Dispute not found.',
      })
    }

    return res.json({
      success: true,
      message: 'Dispute updated successfully.',
      dispute,
    })
  } catch (error) {
    console.error('Update dispute error:', error)

    return res.status(500).json({
      success: false,
      message: 'Failed to update dispute.',
    })
  }
})

module.exports = router