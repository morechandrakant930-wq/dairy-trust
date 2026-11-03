
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Dairy = require('../models/Dairy');

const router = express.Router();

// ===============================
// DAIRY REGISTRATION
// POST /api/dairies/register
// ===============================
router.post('/register', async (req, res) => {
  try {
    const {
      dairyName,
      ownerName,
      email,
      phone,
      password,
      plan,
    } = req.body;

    // Required fields validation
    if (
      !dairyName?.trim() ||
      !ownerName?.trim() ||
      !email?.trim() ||
      !phone?.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields.',
      });
    }

    // Password validation
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least 8 characters.',
      });
    }

    // Phone validation
    if (!/^\d{10}$/.test(phone.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit mobile number.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check existing email
    const existingDairy = await Dairy.findOne({
      email: normalizedEmail,
    });

    if (existingDairy) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    // Validate subscription plan
    const selectedPlan = (plan || 'basic').toLowerCase();

    if (!['basic', 'standard', 'premium'].includes(selectedPlan)) {
      return res.status(400).json({
        success: false,
        message: 'Please select a valid subscription plan.',
      });
    }

    // Hash password before saving
    const passwordHash = await bcrypt.hash(password, 12);

    // Create dairy account
    const dairy = await Dairy.create({
      dairyName: dairyName.trim(),
      ownerName: ownerName.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      passwordHash,
      plan: selectedPlan,
    });

    return res.status(201).json({
      success: true,
      message: 'Dairy registered successfully!',
      dairy: {
        dairyId: dairy.dairyId,
        dairyName: dairy.dairyName,
        ownerName: dairy.ownerName,
        email: dairy.email,
        phone: dairy.phone,
        plan: dairy.plan,
      },
    });
  } catch (error) {
    console.error('Dairy registration error:', error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This email or dairy ID is already registered.',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.',
    });
  }
});

// ===============================
// DAIRY OWNER LOGIN
// POST /api/dairies/login
// ===============================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const dairy = await Dairy.findOne({
      email: normalizedEmail,
    });

    if (!dairy) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      dairy.passwordHash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is missing from .env');

      return res.status(500).json({
        success: false,
        message: 'Server authentication is not configured.',
      });
    }

    const token = jwt.sign(
      {
        accountId: dairy._id.toString(),
        dairyId: dairy.dairyId,
        role: 'dairyOwner',
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful!',
      token,
      dairy: {
        dairyId: dairy.dairyId,
        dairyName: dairy.dairyName,
        ownerName: dairy.ownerName,
        email: dairy.email,
        phone: dairy.phone,
        plan: dairy.plan,
        role: 'dairyOwner',
      },
    });
  } catch (error) {
    console.error('Dairy login error:', error);

    return res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.',
    });
  }
});

module.exports = router;
