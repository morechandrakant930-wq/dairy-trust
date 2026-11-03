
const express = require('express')
const router = express.Router()

const RateChart = require('../models/RateChart')
const RateChartSelection = require('../models/RateChartSelection')
const authMiddleware = require('../middleware/authMiddleware')

const ALLOWED_ANIMALS = ['Cow', 'Buffalo', 'Goat', 'Other']

// Get all saved chart selections for the logged-in dairy
router.get('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'dairyOwner' || !req.user.dairyId) {
      return res.status(403).json({
        success: false,
        message: 'Only Dairy Owners can access chart selections.',
      })
    }

    const selections = await RateChartSelection.find({
      dairyId: req.user.dairyId,
    }).populate('chartId')

    return res.json({
      success: true,
      count: selections.length,
      selections,
    })
  } catch (error) {
    console.error('Load chart selections error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Could not load chart selections.',
    })
  }
})

// Save multiple animal-wise verified charts
router.put('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'dairyOwner' || !req.user.dairyId) {
      return res.status(403).json({
        success: false,
        message: 'Only Dairy Owners can save chart selections.',
      })
    }

    const { chartIds } = req.body

    if (
      !chartIds ||
      typeof chartIds !== 'object' ||
      Array.isArray(chartIds)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide chartIds as an animal-wise object.',
      })
    }

    const animals = Object.keys(chartIds)

    if (animals.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Select at least one animal rate chart.',
      })
    }

    const selectedCharts = []

    for (const animalType of animals) {
      if (!ALLOWED_ANIMALS.includes(animalType)) {
        return res.status(400).json({
          success: false,
          message: `Invalid animal type: ${animalType}`,
        })
      }

      const chartId = chartIds[animalType]

      if (
        typeof chartId !== 'string' ||
        !/^[0-9a-fA-F]{24}$/.test(chartId)
      ) {
        return res.status(400).json({
          success: false,
          message: `A valid chart ID is required for ${animalType}.`,
        })
      }

      const chart = await RateChart.findOne({
        _id: chartId,
        country: 'India',
        animalType,
        verificationStatus: 'verified',
        isActive: true,
        chartType: {
          $in: ['federation', 'government_reference'],
        },
      })

      if (!chart) {
        return res.status(404).json({
          success: false,
          message: `Verified active ${animalType} rate chart not found.`,
        })
      }

      selectedCharts.push({
        dairyId: req.user.dairyId,
        animalType,
        chartId: chart._id,
        state: chart.state,
        federation: chart.federationName,
        chartName: chart.chartName,
        chartSource: chart.sourceName,
        verificationStatus: 'verified',
      })
    }

    // All selected charts must belong to the same state and federation
    const firstChart = selectedCharts[0]

    const hasDifferentFederation = selectedCharts.some(
      (item) =>
        item.state !== firstChart.state ||
        item.federation !== firstChart.federation
    )

    if (hasDifferentFederation) {
      return res.status(400).json({
        success: false,
        message: 'All animal charts must belong to the same state and federation.',
      })
    }

    // Replace this dairy's previous selections
    await RateChartSelection.deleteMany({
      dairyId: req.user.dairyId,
    })

    const selections = await RateChartSelection.insertMany(
      selectedCharts
    )

    return res.json({
      success: true,
      message: 'Animal-wise verified rate charts saved successfully.',
      count: selections.length,
      selections,
    })
  } catch (error) {
    console.error('Save chart selections error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Could not save chart selections.',
    })
  }
})

module.exports = router
