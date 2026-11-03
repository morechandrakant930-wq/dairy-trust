const https = require('https');
const cheerio = require('cheerio');
const URL_TO_SCRAPE = 'https://maharashtra.dairyscheme.com/Help';

function findLatestRateChartPdf(federationWebsiteUrl = URL_TO_SCRAPE) {
  return new Promise((resolve) => {
    console.log(`Scanning Maharashtra Dairy Scheme Help page: ${federationWebsiteUrl}`);

    const options = {
      hostname: 'maharashtra.dairyscheme.com',
      port: 443,
      path: '/Help',
      method: 'GET',
      rejectUnauthorized: false,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    };

    const req = https.request(options, (res) => {
      let html = '';

      res.on('data', (chunk) => {
        html += chunk;
      });

      res.on('end', () => {
        try {
          const $ = cheerio.load(html);
          let pdfUrl = null;

          $('a').each((index, element) => {
            const linkHref = $(element).attr('href');
            const linkText = $(element).text().toLowerCase();
            
            if (linkHref && (
                linkText.includes('rate') || 
                linkText.includes('chart') || 
                linkText.includes('help') || 
                linkText.includes('circular') ||
                linkHref.endsWith('.pdf')
            )) {
              pdfUrl = linkHref.startsWith('http') ? linkHref : new URL(linkHref, federationWebsiteUrl).href;
              return false;
            }
          });

          if (pdfUrl) {
            console.log(`Latest Rate Chart / PDF found: ${pdfUrl}`);
            resolve(pdfUrl);
          } else {
            console.log('No rate chart PDF found on Maharashtra Dairy Scheme Help page.');
            resolve(null);
          }
        } catch (parseError) {
          console.error('Error parsing HTML:', parseError.message);
          resolve(null);
        }
      });
    });

    req.on('error', (error) => {
      console.error('Error scraping Maharashtra Dairy Scheme website:', error.message);
      resolve(null);
    });

    req.end();
  });
}

module.exports = { findLatestRateChartPdf };