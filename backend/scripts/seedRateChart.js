require('dotenv').config();
const mongoose = require('mongoose');
const Federation = require('../models/Federation');

const initialFederations = [
  { federationName: 'Mahanand', state: 'Maharashtra', country: 'India' },
  { federationName: 'Katraj', state: 'Maharashtra', country: 'India' },
  { federationName: 'Gokul', state: 'Maharashtra', country: 'India' },
  { federationName: 'Warana', state: 'Maharashtra', country: 'India' },
  { federationName: 'Amul', state: 'Gujarat', country: 'India' },
  { federationName: 'Nandini', state: 'Karnataka', country: 'India' },
  { federationName: 'Aavin', state: 'Tamil Nadu', country: 'India' },
  { federationName: 'Milma', state: 'Kerala', country: 'India' }
];

async function seedDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dairy-trust');
    console.log('MongoDB connected for seeding...');

    for (const fed of initialFederations) {
      await Federation.updateOne(
        { state: fed.state, federationName: fed.federationName },
        { $set: { ...fed, isActive: true } },
        { upsert: true }
      );
    }
    console.log('Federations seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seedDB();