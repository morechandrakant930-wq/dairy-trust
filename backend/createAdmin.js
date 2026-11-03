
require('dotenv').config()

const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const Admin = require('./models/Admin')

async function createAdmin() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is missing in .env')
    }

    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
      throw new Error('Admin credentials are missing in .env')
    }

    if (process.env.ADMIN_PASSWORD.length < 12) {
      throw new Error('Admin password must be at least 12 characters.')
    }

    await mongoose.connect(process.env.MONGO_URI)

    const email = process.env.ADMIN_EMAIL.trim().toLowerCase()
    const passwordHash = await bcrypt.hash(
      process.env.ADMIN_PASSWORD,
      12
    )

    await Admin.findOneAndUpdate(
      { email },
      {
        $set: {
          name: process.env.ADMIN_NAME || 'Dairy Trust Admin',
          passwordHash,
          role: 'admin',
          isActive: true,
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      }
    )

    console.log('Admin account created/updated successfully.')
  } catch (error) {
    console.error('Admin setup failed:', error.message)
    process.exitCode = 1
  } finally {
    await mongoose.disconnect()
  }
}

createAdmin()
