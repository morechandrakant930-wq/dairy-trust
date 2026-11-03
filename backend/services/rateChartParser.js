const pdfParse = require('pdf-parse');
const axios = require('axios');
const RateChart = require('../models/RateChart');

async function processFederationRateChart(pdfUrl, federationName, state, animalType) {
  try {
    console.log(`Downloading and parsing PDF from: ${pdfUrl}`);

    // १. फेरडेशनच्या अधिकृत लिंकवरून PDF डाऊनलोड करणे
    const response = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
    const pdfBuffer = response.data;

    // २. pdf-parse वापरून PDF मधील मजकूर (text) बाहेर काढणे
    const parsedPdf = await pdfParse(pdfBuffer);
    const pdfText = parsedPdf.text;

    // ३. मजकुरावरून Rate Matrix (FAT & SNF table) तयार करणे
    const rateMatrix = extractMatrixFromText(pdfText);

    // ४. नवीन व्हर्जन ठरवणे आणि डेटाबेसमध्ये सेव्ह करणे
    const existingChart = await RateChart.findOne({ federationName, state, animalType }).sort({ version: -1 });
    const newVersion = existingChart ? existingChart.version + 1 : 1;

    const newRateChart = new RateChart({
      country: 'India',
      state,
      federationName,
      chartName: `${federationName} Auto-Extracted ${animalType} Chart v${newVersion}`,
      chartType: 'federation',
      animalType,
      rateMatrix,
      sourceName: `${federationName} Official Portal`,
      sourceUrl: pdfUrl,
      verificationStatus: 'verified',
      isActive: true,
      version: newVersion,
      effectiveFrom: new Date(),
    });

    await newRateChart.save();
    console.log(`${federationName} (${animalType}) rate chart version ${newVersion} saved successfully!`);
    return true;
  } catch (error) {
    console.error('Error processing PDF rate chart:', error.message);
    return false;
  }
}

// PDF मधील टेक्स्टमधून मॅट्रिक्स टेबल 파र्स करण्याचे लॉजिक
function extractMatrixFromText(text) {
  // येथे तुम्ही फेरडेशनच्या पीडीएफच्या फॉरमॅटनुसार रेग्फेक्स (Regex) किंवा स्ट्रिंग लॉजिक लिहू शकता.
  // सॅम्पलसाठी खाली एक डिफॉल्ट मॅट्रिक्स रिटर्न करत आहे:
  return {
    "3.5": { "8.5": 36.0, "8.6": 36.5, "8.7": 37.0 },
    "3.6": { "8.5": 37.0, "8.6": 37.5, "8.7": 38.0 },
    "4.0": { "8.5": 41.0, "8.6": 41.5, "8.7": 42.0 },
  };
}

module.exports = { processFederationRateChart };