const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const Farmer = require('../models/Farmer');
const Bonus = require('../models/Bonus');
const BonusRate = require('../models/BonusRate');
const MilkCollection = require('../models/MilkCollection');

router.use(authMiddleware);

// Only Dairy Owner can manage bonuses
router.use((req, res, next) => {
  if (req.user.role !== 'dairyOwner') {
    return res.status(403).json({
      message: 'Only Dairy Owner can manage bonuses',
    });
  }
  next();
});

// 1. Give manual bonus to a farmer
router.post('/manual', async (req, res) => {
  try {
    const dairyId = req.user.dairyId;
    const { farmerId, amount, reason, bonusDate } = req.body;

    if (!farmerId || !amount || Number(amount) <= 0) {
      return res.status(400).json({
        message: 'Farmer ID and valid bonus amount are required',
      });
    }

    const farmer = await Farmer.findOne({ farmerId, dairyId });

    if (!farmer) {
      return res.status(404).json({
        message: 'Farmer not found in your dairy',
      });
    }

    const bonus = await Bonus.create({
      dairyId,
      farmerId,
      bonusType: 'manual',
      amount: Number(amount),
      reason: reason || 'Manual Bonus',
      bonusDate: bonusDate ? new Date(bonusDate) : new Date(),
      status: 'approved',
    });

    return res.status(201).json({
      message: 'Manual bonus added successfully',
      bonus,
    });
  } catch (error) {
    console.error('Manual bonus error:', error);
    return res.status(500).json({
      message: 'Unable to add manual bonus',
    });
  }
});

// 2. Add or update FAT/SNF quality bonus rate
router.post('/rates', async (req, res) => {
  try {
    const dairyId = req.user.dairyId;
    const { animalType, fat, snf, bonusPerLitre } = req.body;

    const allowedAnimals = ['Cow', 'Buffalo', 'Goat', 'Other'];

    if (
      !allowedAnimals.includes(animalType) ||
      fat === undefined ||
      snf === undefined ||
      bonusPerLitre === undefined ||
      !Number.isFinite(Number(fat)) ||
      !Number.isFinite(Number(snf)) ||
      !Number.isFinite(Number(bonusPerLitre)) ||
      Number(fat) < 0 ||
      Number(snf) < 0 ||
      Number(bonusPerLitre) < 0
    ) {
      return res.status(400).json({
        message: 'Enter valid animal type, FAT, SNF and bonus rate',
      });
    }

    const rate = await BonusRate.findOneAndUpdate(
      {
        dairyId,
        animalType,
        fat: Number(fat),
        snf: Number(snf),
      },
      {
        $set: {
          bonusPerLitre: Number(bonusPerLitre),
          isActive: true,
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(200).json({
      message: 'Quality bonus rate saved successfully',
      rate,
    });
  } catch (error) {
    console.error('Bonus rate error:', error);
    return res.status(500).json({
      message: 'Unable to save bonus rate',
    });
  }
});

// 3. Get all quality bonus rates for this dairy
router.get('/rates', async (req, res) => {
  try {
    const rates = await BonusRate.find({
      dairyId: req.user.dairyId,
    }).sort({ animalType: 1, fat: 1, snf: 1 });

    return res.json({ rates });
  } catch (error) {
    console.error('Get bonus rates error:', error);
    return res.status(500).json({
      message: 'Unable to get bonus rates',
    });
  }
});

// 4. Deactivate a quality bonus rate
router.patch('/rates/:id/deactivate', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid bonus rate ID',
      });
    }

    const rate = await BonusRate.findOneAndUpdate(
      {
        _id: id,
        dairyId: req.user.dairyId,
      },
      { $set: { isActive: false } },
      { new: true }
    );

    if (!rate) {
      return res.status(404).json({
        message: 'Bonus rate not found',
      });
    }

    return res.json({
      message: 'Bonus rate deactivated successfully',
      rate,
    });
  } catch (error) {
    console.error('Deactivate bonus rate error:', error);
    return res.status(500).json({
      message: 'Unable to deactivate bonus rate',
    });
  }
});

// 5. Get bonus history for this dairy
router.get('/history', async (req, res) => {
  try {
    const bonuses = await Bonus.find({
      dairyId: req.user.dairyId,
    }).sort({ bonusDate: -1 });

    return res.json({ bonuses });
  } catch (error) {
    console.error('Bonus history error:', error);
    return res.status(500).json({
      message: 'Unable to get bonus history',
    });
  }
});

// QUALITY + MANUAL BONUS CALCULATION
router.get('/calculate', async (req, res) => {
  try {
    const dairyId = req.user.dairyId;
    const { farmerId, startDate, endDate } = req.query;

    if (!farmerId || !startDate || !endDate) {
      return res.status(400).json({
        message: 'Farmer ID, start date and end date are required.',
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return res.status(400).json({ message: 'Invalid date range.' });
    }

    const farmer = await Farmer.findOne({ farmerId, dairyId });
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found.' });
    }

    const entries = await MilkCollection.find({
      dairyId,
      farmerId,
      collectionTime: { $gte: start, $lte: end },
    }).lean();

    const rates = await BonusRate.find({
      dairyId,
      animalType: { $in: ['Cow', 'Buffalo', 'Goat', 'Other'] },
      isActive: true,
    }).lean();

    let milkPayment = 0;
    let qualityBonus = 0;

    const qualityDetails = entries.map((entry) => {
      milkPayment += Number(entry.totalPayment || 0);

      const matchingRates = rates
        .filter((rate) =>
          rate.animalType === entry.animalType &&
          rate.fat <= entry.fat &&
          rate.snf <= entry.snf
        )
        .sort((a, b) =>
          (b.fat + b.snf) - (a.fat + a.snf) ||
          b.fat - a.fat ||
          b.snf - a.snf
        );

      const selectedRate = matchingRates[0];
      const bonusPerLitre = selectedRate
        ? Number(selectedRate.bonusPerLitre)
        : 0;

      const bonusAmount = Number(
        (Number(entry.quantity) * bonusPerLitre).toFixed(2)
      );

      qualityBonus += bonusAmount;

      return {
        collectionId: entry._id,
        date: entry.collectionTime,
        animalType: entry.animalType,
        quantity: entry.quantity,
        fat: entry.fat,
        snf: entry.snf,
        bonusPerLitre,
        bonusAmount,
      };
    });

    const manualBonuses = await Bonus.find({
      dairyId,
      farmerId,
      bonusType: 'manual',
      status: 'approved',
      bonusDate: { $gte: start, $lte: end },
    }).lean();

    const manualBonus = manualBonuses.reduce(
      (sum, item) => sum + Number(item.amount || 0), 0
    );

    milkPayment = Number(milkPayment.toFixed(2));
    qualityBonus = Number(qualityBonus.toFixed(2));

    const grossPayment = Number(
      (milkPayment + qualityBonus + manualBonus).toFixed(2)
    );

    res.json({
      success: true,
      farmerId,
      period: { startDate: start, endDate: end },
      totalMilkEntries: entries.length,
      totalQuantity: Number(entries.reduce(
        (sum, entry) => sum + Number(entry.quantity || 0), 0
      ).toFixed(2)),
      milkPayment,
      qualityBonus,
      manualBonus: Number(manualBonus.toFixed(2)),
      grossPayment,
      qualityDetails,
      manualBonuses,
    });
  } catch (error) {
    console.error('Bonus calculation error:', error);
    res.status(500).json({ message: 'Unable to calculate bonus.' });
  }
});

module.exports = router;