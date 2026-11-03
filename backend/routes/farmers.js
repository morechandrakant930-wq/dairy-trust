const express = require('express')
const bcrypt = require('bcryptjs')
const Farmer = require('../models/Farmer')
const authMiddleware = require('../middleware/authMiddleware')

const router = express.Router()

// Only dairy owners can access farmer-management routes.
router.use(authMiddleware)

router.use((req, res, next) => {
  if (req.user.role !== 'dairyOwner') {
    return res.status(403).json({
      success: false,
      message: 'Only dairy owners can manage farmers.',
    })
  }

  next()
})

// Add a farmer to the logged-in owner's dairy.

router.post('/', async (req, res) => {
  try {
    const {
      farmerId,
      name,
      mobileNumber,
      mobile,
      village,
      animalType,
      temporaryPassword,
    } = req.body || {}

    const finalMobile = String(mobileNumber ?? mobile ?? '').trim()

    console.log('Farmer registration validation:', {
      farmerId: !!farmerId,
      name: !!name,
      mobile: !!finalMobile,
      village: !!village,
      password: !!temporaryPassword,
    })

    if (
      !String(farmerId || '').trim() ||
      !String(name || '').trim() ||
      !finalMobile ||
      !String(village || '').trim() ||
      !temporaryPassword
    ) {
      return res.status(400).json({
        success: false,
        message: 'Farmer ID, name, mobile, village and temporary password are required.',
      })
    }

    if (temporaryPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Temporary password must contain at least 8 characters.',
      })
    }

    const farmer = await Farmer.create({
      farmerId: String(farmerId).trim(),
      dairyId: req.user.dairyId,
      name: String(name).trim(),
      mobileNumber: finalMobile,
      village: String(village).trim(),
      animalType: animalType || 'Cow',
      passwordHash: await bcrypt.hash(temporaryPassword, 12),
      mustChangePassword: true,
    })

    return res.status(201).json({
      success: true,
      message: 'Farmer added successfully.',
      data: {
        farmerId: farmer.farmerId,
        dairyId: farmer.dairyId,
        name: farmer.name,
        mobileNumber: farmer.mobileNumber,
        village: farmer.village,
        animalType: farmer.animalType,
        mustChangePassword: farmer.mustChangePassword,
      },
    })

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This Farmer ID is already registered.',
      })
    }

    console.error('Farmer registration error:', error)

    return res.status(500).json({
      success: false,
      message: 'Failed to register farmer.',
    })
  }
})


// Fetch farmers belonging only to the logged-in owner's dairy.
router.get('/', async (req, res) => {
  try {
    const farmers = await Farmer.find({
      dairyId: req.user.dairyId,
    })
      .select('-passwordHash')
      .sort({ createdAt: -1 })

    return res.json({
      success: true,
      count: farmers.length,
      data: farmers,
    })
  } catch (error) {
    console.error('Fetch farmers error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch farmers.',
    })
  }
})

module.exports = router