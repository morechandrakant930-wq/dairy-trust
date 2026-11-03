const express = require('express');
const router = express.Router();

const RateChart = require('../models/RateChart');
const authMiddleware = require('../middleware/authMiddleware');

const ALLOWED_ANIMALS = ['Cow', 'Buffalo', 'Goat', 'Other'];

function validateMatrix(rateMatrix, fatValues, snfValues) {
  if (
    !rateMatrix ||
    typeof rateMatrix !== 'object' ||
    Array.isArray(rateMatrix) ||
    !Array.isArray(fatValues) ||
    !Array.isArray(snfValues) ||
    fatValues.length === 0 ||
    snfValues.length === 0
  ) {
    return 'FAT values, SNF values and rate matrix are required.';
  }

  for (const fat of fatValues) {
    if (!Number.isFinite(Number(fat)) || Number(fat) <= 0) {
      return 'Invalid FAT value.';
    }

    for (const snf of snfValues) {
      const rate = rateMatrix[String(fat)]?.[String(snf)];

      if (
        rate === undefined ||
        rate === null ||
        rate === '' ||
        !Number.isFinite(Number(rate)) ||
        Number(rate) <= 0
      ) {
        return `Please enter a valid rate for FAT ${fat} and SNF ${snf}.`;
      }
    }
  }

  return null;
}

// GET: Load this dairy's manual rate charts
router.get('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'dairyOwner' || !req.user.dairyId) {
      return res.status(403).json({
        success: false,
        message: 'Only Dairy Owner can access rate charts.',
      });
    }

    const filter = {
      dairyId: String(req.user.dairyId),
    };

    if (req.query.animalType) {
      if (!ALLOWED_ANIMALS.includes(req.query.animalType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid animal type.',
        });
      }

      filter.animalType = req.query.animalType;
    }

    if (req.query.activeOnly !== 'false') {
      filter.isActive = true;
    }

    const charts = await RateChart.find(filter).sort({
      animalType: 1,
      updatedAt: -1,
    });

    return res.json({
      success: true,
      count: charts.length,
      data: charts,
    });
  } catch (error) {
    console.error('Get rate charts error:', error);

    return res.status(500).json({
      success: false,
      message: 'Could not load rate charts.',
    });
  }
});

// POST: Save manual FAT/SNF chart
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'dairyOwner' || !req.user.dairyId) {
      return res.status(403).json({
        success: false,
        message: 'Only Dairy Owner can save rate charts.',
      });
    }

    const {
      animalType,
      chartName,
      fatValues,
      snfValues,
      rateMatrix,
    } = req.body;

    if (!ALLOWED_ANIMALS.includes(animalType)) {
      return res.status(400).json({
        success: false,
        message: 'Select a valid animal type.',
      });
    }

    const matrixError = validateMatrix(
      rateMatrix,
      fatValues,
      snfValues
    );

    if (matrixError) {
      return res.status(400).json({
        success: false,
        message: matrixError,
      });
    }

    const dairyId = String(req.user.dairyId);

    const oldChart = await RateChart.findOne({
      dairyId,
      animalType,
      isActive: true,
    });

    const nextVersion = oldChart ? oldChart.version + 1 : 1;

    // Deactivate old chart for this dairy and animal
    await RateChart.updateMany(
      { dairyId, animalType, isActive: true },
      { $set: { isActive: false } }
    );

    const chart = await RateChart.create({
      dairyId,
      chartName: chartName?.trim() || `${animalType} Manual Rate Chart`,
      chartType: 'manual',
      animalType,
      fatValues: fatValues.map(Number).sort((a, b) => a - b),
      snfValues: snfValues.map(Number).sort((a, b) => a - b),
      rateMatrix,
      isActive: true,
      version: nextVersion,
    });

    return res.status(201).json({
      success: true,
      message: 'Manual FAT/SNF rate chart saved successfully.',
      data: chart,
    });
  } catch (error) {
    console.error('Save rate chart error:', error);

    return res.status(500).json({
      success: false,
      message: 'Could not save manual rate chart.',
    });
  }
});

module.exports = router;