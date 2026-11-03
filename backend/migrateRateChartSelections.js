
require('dotenv').config()

const mongoose = require('mongoose')
mongoose.set('autoIndex', false)

const RateChart = require('./models/RateChart')

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log('MongoDB connected.')

    const collection = mongoose.connection.collection(
      'ratechartselections'
    )

    const selections = await collection.find({}).toArray()

    // Add animalType to old records using their linked RateChart
    for (const selection of selections) {
      if (!selection.animalType) {
        const chart = await RateChart.findById(selection.chartId)

        if (!chart) {
          throw new Error(
            `RateChart not found for selection ${selection._id}. Migration stopped safely.`
          )
        }

        await collection.updateOne(
          { _id: selection._id },
          { $set: { animalType: chart.animalType } }
        )

        console.log(
          `Updated selection ${selection._id}: ${chart.animalType}`
        )
      }
    }

    // Remove the old unique index on dairyId
    const indexes = await collection.indexes()
    const oldIndex = indexes.find(
      (index) => index.name === 'dairyId_1'
    )

    if (oldIndex) {
      await collection.dropIndex('dairyId_1')
      console.log('Old dairyId unique index removed.')
    } else {
      console.log('Old dairyId index not found.')
    }

    // Create unique index for one chart per dairy per animal
    await collection.createIndex(
      { dairyId: 1, animalType: 1 },
      { unique: true, name: 'dairyId_1_animalType_1' }
    )

    console.log('New compound unique index created.')
    console.log('Migration completed successfully.')
  } catch (error) {
    console.error('Migration failed:', error.message)
  } finally {
    await mongoose.disconnect()
  }
}

migrate()
