const { findLatestRateChartPdf } = require('./services/rateScraper');
const { processFederationRateChart } = require('./services/rateChartParser');

async function testPipeline() {
  console.log('🧪 Testing Rate Chart Scraping & Parsing Pipeline...');
  
  const testUrl = 'https://gokulmilk.com'; // गोकुळ किंवा इतर वेबसाईट
  const pdfUrl = await findLatestRateChartPdf(testUrl);

  if (pdfUrl) {
    console.log(`✅ Test Successful! Found PDF: ${pdfUrl}`);
    // प्रत्यक्ष डेटाबेसमध्ये सेव्ह करून टेस्ट करायचे असल्यास खालील लाईन अनकमेंट करा:
    // await processFederationRateChart(pdfUrl, 'Gokul', 'Maharashtra', 'Cow');
  } else {
    console.log('❌ Test Failed: No PDF link detected.');
  }
}

testPipeline();