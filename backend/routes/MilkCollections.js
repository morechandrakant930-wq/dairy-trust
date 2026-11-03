const express = require('express')
const mongoose = require('mongoose')
const MilkCollection = require('../models/MilkCollection')
const Farmer = require('../models/Farmer')
const RateChart = require('../models/RateChart')
const authMiddleware = require('../middleware/authMiddleware')

const router = express.Router()

const VALID_ANIMALS = ['Cow', 'Buffalo', 'Goat', 'Other']

function interpolateRate(chart, fat, snf) {
  const fats = [...chart.fatValues].map(Number).sort((a, b) => a - b);
  const snfs = [...chart.snfValues].map(Number).sort((a, b) => a - b);

  if (
    !fats.length ||
    !snfs.length ||
    fat < fats[0] ||
    fat > fats[fats.length - 1] ||
    snf < snfs[0] ||
    snf > snfs[snfs.length - 1]
  ) {
    return null;
  }

  function getBounds(values, value) {
    const exact = values.find(v => Math.abs(v - value) < 0.000001);
    if (exact !== undefined) return [exact, exact];

    for (let i = 0; i < values.length - 1; i++) {
      if (value > values[i] && value < values[i + 1]) {
        return [values[i], values[i + 1]];
      }
    }
    return null;
  }

  const fatBounds = getBounds(fats, fat);
  const snfBounds = getBounds(snfs, snf);

  if (!fatBounds || !snfBounds) return null;

  const getRate = (f, s) => {
    const row = chart.rateMatrix?.[String(f)];
    const value = row?.[String(s)];
    return value !== undefined && value !== '' &&
      Number.isFinite(Number(value)) && Number(value) > 0
      ? Number(value)
      : null;
  };

  const [f1, f2] = fatBounds;
  const [s1, s2] = snfBounds;

  const r11 = getRate(f1, s1);
  const r12 = getRate(f1, s2);
  const r21 = getRate(f2, s1);
  const r22 = getRate(f2, s2);

  if ([r11, r12, r21, r22].some(v => v === null)) return null;

  if (f1 === f2 && s1 === s2) return r11;

  if (f1 === f2) {
    return r11 + ((snf - s1) / (s2 - s1)) * (r12 - r11);
  }

  if (s1 === s2) {
    return r11 + ((fat - f1) / (f2 - f1)) * (r21 - r11);
  }

  const t = (fat - f1) / (f2 - f1);
  const u = (snf - s1) / (s2 - s1);

  return (
    r11 * (1 - t) * (1 - u) +
    r21 * t * (1 - u) +
    r12 * (1 - t) * u +
    r22 * t * u
  );
}

// POST: Save milk collection using Manual FAT/SNF rate chart
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'dairyOwner') {
      return res.status(403).json({
        success: false,
        message: 'Only Dairy Owner can record milk collection.',
      })
    }

    const {
      farmerId,
      animalType,
      quantity,
      fat,
      snf,
      collectionTime,
    } = req.body

    if (
      !farmerId ||
      !VALID_ANIMALS.includes(animalType) ||
      quantity === undefined ||
      quantity === '' ||
      fat === undefined ||
      fat === '' ||
      snf === undefined ||
      snf === ''
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please enter farmer, animal, quantity, FAT and SNF.',
      })
    }

    const quantityValue = Number(quantity)
    const fatValue = Number(fat)
    const snfValue = Number(snf)

    if (
      !Number.isFinite(quantityValue) ||
      quantityValue <= 0 ||
      !Number.isFinite(fatValue) ||
      fatValue < 0 ||
      !Number.isFinite(snfValue) ||
      snfValue < 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid quantity, FAT or SNF value.',
      })
    }

    const selectedTime = collectionTime
      ? new Date(collectionTime)
      : new Date()

    if (Number.isNaN(selectedTime.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid collection date and time.',
      })
    }

    const dairyId = String(req.user.dairyId)

    // Verify farmer belongs to the logged-in dairy
    const farmer = await Farmer.findOne({
      farmerId: String(farmerId).trim(),
      dairyId,
    })

    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: 'Farmer not found in your dairy.',
      })
    }

    // Find this dairy's active manual chart for the selected animal
    const chart = await RateChart.findOne({
      dairyId,
      animalType,
      chartType: 'manual',
      isActive: true,
    }).lean()

    if (!chart) {
      return res.status(400).json({
        success: false,
        message: `Please create an active ${animalType} FAT/SNF rate chart first.`,
      })
    }

    // Animal-specific FAT validation
    if (
      (animalType === 'Cow' && (fatValue < 3 || fatValue > 5)) ||
      (animalType === 'Buffalo' && (fatValue < 4 || fatValue > 10))
    ) {
      return res.status(400).json({
        success: false,
        message: `Invalid FAT for ${animalType}.`,
      });
    }

    // Calculate rate using interpolation
    const calculatedRate = interpolateRate(chart, fatValue, snfValue);

    if (
      calculatedRate === null ||
      !Number.isFinite(calculatedRate) ||
      calculatedRate <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: `Rate chart coverage not available for FAT ${fatValue} and SNF ${snfValue}. Please add surrounding FAT/SNF values and rates in your chart.`,
      });
    }

    const ratePerLitre = Number(calculatedRate.toFixed(2));
    const totalPayment = Number(
      (quantityValue * ratePerLitre).toFixed(2)
    )

    const collection = await MilkCollection.create({
      farmerId: farmer.farmerId,
      dairyId,
      animalType,
      quantity: quantityValue,
      fat: fatValue,
      snf: snfValue,
      ratePerLitre,
      totalPayment,
      collectionTime: selectedTime,
      rateChartSnapshot: {
        chartId: chart._id,
        chartName: chart.chartName,
        state: 'Manual',
        version: chart.version || 1,
      },
    })

    return res.status(201).json({
      success: true,
      message: 'Milk collection saved successfully.',
      data: collection,
      calculation: {
        ratePerLitre,
        quantity: quantityValue,
        totalPayment,
      },
    })
  } catch (error) {
    console.error('Milk collection save error:', error)

    return res.status(500).json({
      success: false,
      message: 'Could not save milk collection.',
    })
  }
})

// GET: Periodic milk collection report for dairy owner
router.get('/report', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'dairyOwner') {
      return res.status(403).json({
        success: false,
        message: 'Only Dairy Owner can view milk reports.',
      });
    }

    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required.',
      });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD.',
      });
    }

    const [sy, sm, sd] = startDate.split('-').map(Number);
    const [ey, em, ed] = endDate.split('-').map(Number);

    const start = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);

    if (
      start.getFullYear() !== sy ||
      start.getMonth() !== sm - 1 ||
      start.getDate() !== sd ||
      end.getFullYear() !== ey ||
      end.getMonth() !== em - 1 ||
      end.getDate() !== ed ||
      start > end
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date range.',
      });
    }

    const nextDay = new Date(ey, em - 1, ed + 1);

    const collections = await MilkCollection.find({
      dairyId: String(req.user.dairyId),
      collectionTime: {
        $gte: start,
        $lt: nextDay,
      },
    })
      .sort({ collectionTime: 1 })
      .lean();

    const summary = {
      morning: { entries: 0, litres: 0, payment: 0 },
      evening: { entries: 0, litres: 0, payment: 0 },
      outsideSession: { entries: 0, litres: 0, payment: 0 },
      totalEntries: 0,
      totalLitres: 0,
      totalPayment: 0,
    };

    for (const item of collections) {
      const hours = new Date(item.collectionTime).getHours();

      let session;

      if (hours >= 4 && hours < 9) {
        session = 'morning';
      } else if (hours >= 16 && hours < 21) {
        session = 'evening';
      } else {
        session = 'outsideSession';
      }

      const litres = Number(item.quantity) || 0;
      const payment = Number(item.totalPayment) || 0;

      summary[session].entries += 1;
      summary[session].litres += litres;
      summary[session].payment += payment;

      summary.totalEntries += 1;
      summary.totalLitres += litres;
      summary.totalPayment += payment;
    }

    for (const session of ['morning', 'evening', 'outsideSession']) {
      summary[session].litres = Number(
        summary[session].litres.toFixed(2)
      );

      summary[session].payment = Number(
        summary[session].payment.toFixed(2)
      );
    }

    summary.totalLitres = Number(summary.totalLitres.toFixed(2));
    summary.totalPayment = Number(summary.totalPayment.toFixed(2));

    return res.json({
      success: true,
      data: {
        startDate,
        endDate,
        summary,
        collections,
      },
    });
  } catch (error) {
    console.error('Milk report error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to generate milk collection report.',
    });
  }
});

// GET: Milk records for the logged-in farmer
router.get('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'farmer') {
      return res.status(403).json({
        success: false,
        message: 'Farmer access only',
      })
    }

    const farmer = await Farmer.findById(req.user.accountId)
      .select('farmerId dairyId')

    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: 'Farmer not found',
      })
    }

    const collections = await MilkCollection.find({
      farmerId: farmer.farmerId,
      dairyId: farmer.dairyId,
    }).sort({ createdAt: -1 })

    return res.json({
      success: true,
      count: collections.length,
      data: collections,
    })
  } catch (error) {
    console.error('Fetch collections error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch milk collections',
    })
  }
})

// GET: Daily milk collection summary for dairy owner
router.get('/daily-summary', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'dairyOwner') {
      return res.status(403).json({
        success: false,
        message: 'Only dairy owners can view daily collection summaries.',
      })
    }

    const { date } = req.query
    const selectedDate = date || new Date().toISOString().slice(0, 10)

    if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date. Use YYYY-MM-DD format.',
      })
    }

    const [year, month, day] = selectedDate.split('-').map(Number)
    const startOfDay = new Date(year, month - 1, day)
    const nextDay = new Date(year, month - 1, day + 1)

    const collections = await MilkCollection.find({
      dairyId: String(req.user.dairyId),
      collectionTime: {
        $gte: startOfDay,
        $lt: nextDay,
      },
    }).lean()

    const summary = {
      date: selectedDate,
      morning: {
        totalLitres: 0,
        totalPayment: 0,
        collectionEntries: 0,
        farmers: [],
      },
      evening: {
        totalLitres: 0,
        totalPayment: 0,
        collectionEntries: 0,
        farmers: [],
      },
      outsideSession: {
        totalLitres: 0,
        totalPayment: 0,
        collectionEntries: 0,
        farmers: [],
      },
      wholeDay: {
        totalLitres: 0,
        totalPayment: 0,
        collectionEntries: 0,
        farmers: [],
      },
    }

    const farmerSets = {
      morning: new Set(),
      evening: new Set(),
      outsideSession: new Set(),
      wholeDay: new Set(),
    }

    for (const collection of collections) {
      const hours = new Date(collection.collectionTime).getHours()

      let session

      if (hours >= 4 && hours < 9) {
        session = 'morning'
      } else if (hours >= 16 && hours < 21) {
        session = 'evening'
      } else {
        session = 'outsideSession'
      }

      const quantityValue = Number(collection.quantity) || 0
      const paymentValue = Number(collection.totalPayment) || 0
      const collectedFarmerId = collection.farmerId

      summary[session].totalLitres += quantityValue
      summary[session].totalPayment += paymentValue
      summary[session].collectionEntries += 1
      farmerSets[session].add(collectedFarmerId)

      summary.wholeDay.totalLitres += quantityValue
      summary.wholeDay.totalPayment += paymentValue
      summary.wholeDay.collectionEntries += 1
      farmerSets.wholeDay.add(collectedFarmerId)
    }

    for (const session of [
      'morning',
      'evening',
      'outsideSession',
      'wholeDay',
    ]) {
      summary[session].totalLitres =
        Math.round(summary[session].totalLitres * 100) / 100

      summary[session].totalPayment =
        Math.round(summary[session].totalPayment * 100) / 100

      summary[session].farmers = [...farmerSets[session]]
      summary[session].uniqueFarmers = farmerSets[session].size
    }

    return res.json({
      success: true,
      data: summary,
    })
  } catch (error) {
    console.error('Daily milk summary error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch daily milk collection summary.',
    })
  }
})

// GET: Farmer history for the logged-in dairy owner
router.get('/farmer-history', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'dairyOwner') {
      return res.status(403).json({
        success: false,
        message: 'Only dairy owners can view farmer history.',
      })
    }

    const dairyId = String(req.user.dairyId).trim();

    const { farmerId } = req.query

    const farmerFilter = { dairyId }

    if (farmerId) {
      farmerFilter.farmerId = farmerId
    }

    const farmers = await Farmer.find(farmerFilter)
      .select('-passwordHash')
      .sort({ name: 1 })
      .lean()

    const collectionFilter = { dairyId }

    if (farmerId) {
      collectionFilter.farmerId = farmerId
    }

    const collections = await MilkCollection.find(collectionFilter)
      .sort({ collectionTime: -1 })
      .lean()

    return res.json({
      success: true,
      data: {
        farmers,
        collections,
      },
    })
  } catch (error) {
    console.error('Farmer history error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch farmer history.',
    })
  }
})

module.exports = router