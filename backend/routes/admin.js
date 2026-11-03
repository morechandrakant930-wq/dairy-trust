const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // किंवा तुमच्या प्रोजेक्टनुसार 'bcrypt'

const Dairy = require('../models/Dairy');
const Farmer = require('../models/Farmer');
const MilkCollection = require('../models/MilkCollection');
const Admin = require('../models/Admin');

const authMiddleware = require('../middleware/authMiddleware');
const adminOnly = require('../middleware/adminOnly');

// =====================================
// ADMIN DASHBOARD
// GET /api/admin/dashboard
// =====================================
router.get('/dashboard', authMiddleware, adminOnly, async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Welcome to Admin Dashboard',
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load admin dashboard.',
    });
  }
});

// =====================================
// GET ALL REGISTERED DAIRIES
// GET /api/admin/dairies
// =====================================
router.get('/dairies', authMiddleware, adminOnly, async (req, res) => {
  try {
    const dairies = await Dairy.find()
      .select('-passwordHash -__v')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: dairies.length,
      dairies,
    });
  } catch (error) {
    console.error('Admin dairy list error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dairy accounts.',
    });
  }
});

// =====================================
// GET ALL REGISTERED FARMERS
// GET /api/admin/farmers
// =====================================
router.get('/farmers', authMiddleware, adminOnly, async (req, res) => {
  try {
    const farmers = await Farmer.find()
      .select(
        'farmerId dairyId name mobileNumber village animalType paymentMode paymentModeRequest.status mustChangePassword createdAt'
      )
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: farmers.length,
      farmers,
    });
  } catch (error) {
    console.error('Admin farmer list error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch farmer accounts.',
    });
  }
});

// =====================================
// ALL MILK COLLECTION RECORDS
// GET /api/admin/collections
// =====================================
router.get('/collections', authMiddleware, adminOnly, async (req, res) => {
  try {
    const collections = await MilkCollection.find()
      .select(
        'farmerId dairyId animalType quantity fat snf ratePerLitre totalPayment collectionTime paymentStatus'
      )
      .sort({ collectionTime: -1 })
      .lean();

    const farmerIds = [...new Set(collections.map(item => item.farmerId))];
    const dairyIds = [...new Set(collections.map(item => item.dairyId))];

    const [farmers, dairies] = await Promise.all([
      Farmer.find({ farmerId: { $in: farmerIds } })
        .select('farmerId name village dairyId')
        .lean(),
      Dairy.find({ dairyId: { $in: dairyIds } })
        .select('dairyId dairyName')
        .lean(),
    ]);

    const farmerMap = new Map(
      farmers.map(f => [`${f.dairyId}:${f.farmerId}`, f])
    );

    const dairyMap = new Map(
      dairies.map(d => [d.dairyId, d.dairyName])
    );

    const result = collections.map(item => {
      const farmer = farmerMap.get(`${item.dairyId}:${item.farmerId}`);

      return {
        ...item,
        farmerName: farmer?.name || 'Unknown Farmer',
        village: farmer?.village || '',
        dairyName: dairyMap.get(item.dairyId) || 'Unknown Dairy',
      };
    });

    res.json({
      success: true,
      count: result.length,
      collections: result,
    });
  } catch (error) {
    console.error('Admin collections error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch milk collections.',
    });
  }
});

// =====================================
// PAYMENT REPORTS
// GET /api/admin/payments
// =====================================
router.get('/payments', authMiddleware, adminOnly, async (req, res) => {
  try {
    const payments = await MilkCollection.find()
      .select(
        'farmerId dairyId quantity totalPayment paymentStatus paymentDate paymentReference collectionTime paymentCycleId'
      )
      .sort({ collectionTime: -1 })
      .lean();

    const farmerIds = [...new Set(payments.map(item => item.farmerId))];
    const dairyIds = [...new Set(payments.map(item => item.dairyId))];

    const [farmers, dairies] = await Promise.all([
      Farmer.find({ farmerId: { $in: farmerIds } })
        .select('farmerId name dairyId')
        .lean(),
      Dairy.find({ dairyId: { $in: dairyIds } })
        .select('dairyId dairyName')
        .lean(),
    ]);

    const farmerMap = new Map(
      farmers.map(f => [`${f.dairyId}:${f.farmerId}`, f.name])
    );

    const dairyMap = new Map(
      dairies.map(d => [d.dairyId, d.dairyName])
    );

    const summary = {
      totalRecords: payments.length,
      totalAmount: 0,
      paidAmount: 0,
      pendingAmount: 0,
      processingAmount: 0,
      paidCount: 0,
      pendingCount: 0,
      processingCount: 0,
    };

    const result = payments.map(item => {
      const amount = Number(item.totalPayment || 0);
      const status = item.paymentStatus || 'pending';

      summary.totalAmount += amount;

      if (status === 'paid') {
        summary.paidAmount += amount;
        summary.paidCount++;
      } else if (status === 'processing') {
        summary.processingAmount += amount;
        summary.processingCount++;
      } else {
        summary.pendingAmount += amount;
        summary.pendingCount++;
      }

      return {
        ...item,
        farmerName:
          farmerMap.get(`${item.dairyId}:${item.farmerId}`) || 'Unknown Farmer',
        dairyName: dairyMap.get(item.dairyId) || 'Unknown Dairy',
      };
    });

    res.json({
      success: true,
      summary,
      payments: result,
    });
  } catch (error) {
    console.error('Admin payment report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment reports.',
    });
  }
});

// =====================================
// ADMIN CHANGE PASSWORD
// PUT /api/admin/change-password
// =====================================
router.put('/change-password', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please fill all password fields.',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters.',
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirm password do not match.',
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password.',
      });
    }

    const admin = await Admin.findById(req.user.accountId);

    if (!admin || !admin.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Admin account not found or inactive.',
      });
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      admin.passwordHash
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    admin.passwordHash = await bcrypt.hash(newPassword, 10);
    await admin.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    console.error('Admin change password error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to change password.',
    });
  }
});

module.exports = router;