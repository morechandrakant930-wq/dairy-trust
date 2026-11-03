require('dotenv').config();
const mongoose = require('mongoose');
const RateChart = require('../models/RateChart');

async function seedRateCharts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dairy-trust');
    console.log('MongoDB connected for rate chart seeding...');

    const sampleRateChart = {
      country: 'India',
      state: 'Maharashtra',
      federationName: 'Gokul',
      chartName: 'Gokul Standard Cow Rate Chart 2026',
      chartType: 'federation',
      animalType: 'Cow',
      rateMatrix: {
        "3.5": { "8.5": 35.0, "8.6": 35.5, "8.7": 36.0 },
        "3.6": { "8.5": 36.0, "8.6": 36.5, "8.7": 37.0 },
        "4.0": { "8.5": 40.0, "8.6": 40.5, "8.7": 41.0 }
      },
      sourceName: 'Gokul Dairy Cooperative Official',
      verificationStatus: 'verified',
      isActive: true,
      version: 1,
      effectiveFrom: new Date()
    };

    await RateChart.updateOne(
      { state: 'Maharashtra', federationName: 'Gokul', animalType: 'Cow', chartName: sampleRateChart.chartName },
      { $set: sampleRateChart },
      { upsert: true }
    );

    console.log('Sample verified rate chart seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seedRateCharts();