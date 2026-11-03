const express = require('express');
const router = express.Router();

const MilkRate = require('../models/MilkRate');
const authMiddleware = require('../middleware/authMiddleware');

const DEFAULT_RATES = {
  cowRate: 36,
  buffaloRate: 50,
  goatRate: 45,
  otherRate: 30,
};

// Get logged-in dairy's milk rates
router.get('/:dairyId', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'dairyOwner') {
      return res.status(403).json({
        success: false,
        message: 'Only Dairy Owner can access milk rates.',
      });
    }

    const dairyId = String(req.user.dairyId);

    if (req.params.dairyId !== dairyId) {
      return res.status(403).json({
        success: false,
        message: 'You cannot access another dairy rates.',
      });
    }

    let rates = await MilkRate.findOne({ dairyId });

    if (!rates) {
      rates = await MilkRate.create({
        dairyId,
        ...DEFAULT_RATES,
      });
    }

    return res.status(200).json({
      success: true,
      rates,
    });
  } catch (error) {
    console.error('Get milk rates error:', error);

    return res.status(500).json({
      success: false,
      message: 'Could not load milk rates.',
    });
  }
});

// Dairy Owner manually updates rates
router.put('/:dairyId', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'dairyOwner') {
      return res.status(403).json({
        success: false,
        message: 'Only Dairy Owner can update milk rates.',
      });
    }

    const dairyId = String(req.user.dairyId);

    if (req.params.dairyId !== dairyId) {
      return res.status(403).json({
        success: false,
        message: 'You cannot update another dairy rates.',
      });
    }

    const { cowRate, buffaloRate, goatRate, otherRate } = req.body;

    const values = {
      cowRate,
      buffaloRate,
      goatRate,
      otherRate,
    };

    for (const [key, value] of Object.entries(values)) {
      if (
        value === undefined ||
        value === null ||
        value === '' ||
        !Number.isFinite(Number(value)) ||
        Number(value) <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: `${key} must be a number greater than zero.`,
        });
      }
    }

    const rates = await MilkRate.findOneAndUpdate(
      { dairyId },
      {
        $set: {
          cowRate: Number(cowRate),
          buffaloRate: Number(buffaloRate),
          goatRate: Number(goatRate),
          otherRate: Number(otherRate),
        },
        $setOnInsert: { dairyId },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Manual milk rates saved successfully.',
      rates,
    });
  } catch (error) {
    console.error('Update milk rates error:', error);

    return res.status(500).json({
      success: false,
      message: 'Could not update milk rates.',
    });
  }
});

module.exports = router;