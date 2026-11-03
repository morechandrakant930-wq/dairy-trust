
const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const Dairy = require('../models/Dairy')
const Farmer = require('../models/Farmer')
const Admin = require('../models/Admin')

const authMiddleware = require('../middleware/authMiddleware')

const router = express.Router()

// =====================================
// LOGIN: Admin, Dairy Owner and Farmer
// POST /api/auth/login
// =====================================
router.post('/login', async (req, res) => {
  try {
    const { role, email, farmerId, dairyId, password } = req.body

    if (!role || !password) {
      return res.status(400).json({
        success: false,
        message: 'Role and password are required.',
      })
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'Authentication configuration is missing.',
      })
    }

    let account

    // ADMIN LOGIN
    if (role === 'admin') {
      if (!email?.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Email is required.',
        })
      }

      account = await Admin.findOne({
        email: email.trim().toLowerCase(),
        isActive: true,
      })

      if (
        !account ||
        !(await bcrypt.compare(password, account.passwordHash))
      ) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.',
        })
      }
    }

    // DAIRY OWNER LOGIN
    else if (role === 'dairyOwner') {
      if (!email?.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Email is required.',
        })
      }

      account = await Dairy.findOne({
        email: email.trim().toLowerCase(),
      })

      if (
        !account ||
        !(await bcrypt.compare(password, account.passwordHash))
      ) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.',
        })
      }
    }

    // FARMER LOGIN
    else if (role === 'farmer') {
      if (!farmerId?.trim() || !dairyId?.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Farmer ID and Dairy ID are required.',
        })
      }

      account = await Farmer.findOne({
        farmerId: farmerId.trim(),
        dairyId: dairyId.trim(),
      })

      if (
        !account ||
        !account.passwordHash ||
        !(await bcrypt.compare(password, account.passwordHash))
      ) {
        return res.status(401).json({
          success: false,
          message: 'Invalid login credentials.',
        })
      }
    }

    else {
      return res.status(400).json({
        success: false,
        message: 'Invalid account role.',
      })
    }

    const token = jwt.sign(
      {
        accountId: account._id.toString(),
        role: account.role,
        dairyId: role === 'admin' ? null : account.dairyId,
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    )

    const user = {
      role: account.role,
      dairyId: role === 'admin' ? null : account.dairyId,
    }

    if (role === 'admin') {
      user.name = account.name
      user.email = account.email
    }

    if (role === 'dairyOwner') {
      user.dairyName = account.dairyName
      user.ownerName = account.ownerName
      user.email = account.email
      user.plan = account.plan
    }

    if (role === 'farmer') {
      user.farmerId = account.farmerId
      user.name = account.name
      user.mustChangePassword = account.mustChangePassword
    }

    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      user,
    })

  } catch (error) {
    console.error('Login error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.',
    })
  }
})


// =====================================
// CHANGE PASSWORD: DAIRY OWNER / FARMER
// PUT /api/auth/change-password
// =====================================
router.put('/change-password', authMiddleware, async (req, res) => {
  try {
    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = req.body

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please fill all password fields.',
      })
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters.',
      })
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirm password do not match.',
      })
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password.',
      })
    }

    let account

    // DAIRY OWNER
    if (req.user.role === 'dairyOwner') {
      account = await Dairy.findById(req.user.accountId)
    }

    // FARMER
    else if (req.user.role === 'farmer') {
      account = await Farmer.findById(req.user.accountId)
    }

    // ADMIN NOT ALLOWED ON THIS ROUTE
    else {
      return res.status(403).json({
        success: false,
        message: 'This feature is only for Dairy Owners and Farmers.',
      })
    }

    if (!account || !account.passwordHash) {
      return res.status(404).json({
        success: false,
        message: 'Account not found.',
      })
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      account.passwordHash
    )

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect.',
      })
    }

    account.passwordHash = await bcrypt.hash(newPassword, 12)

    // Farmer first-time password change flag
    if (req.user.role === 'farmer') {
      account.mustChangePassword = false
    }

    await account.save()

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    })

  } catch (error) {
    console.error('Change password error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Failed to change password.',
    })
  }
})

module.exports = router
