
require('dotenv').config()

const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const Dairy = require('./models/Dairy')

async function checkPassword() {
  try {
    await mongoose.connect(process.env.MONGO_URI)

    const email = 'ketan@gmail.com'
    const password = 'ketant@123'

    const dairy = await Dairy.findOne({ email })

    if (!dairy) {
      console.log('Dairy account not found')
      return
    }

    const result = await bcrypt.compare(
      password,
      dairy.passwordHash
    )

    console.log('Account found:', true)
    console.log('Password matches:', result)

  } catch (error) {
    console.error(error.message)
  } finally {
    await mongoose.disconnect()
  }
}

checkPassword()
