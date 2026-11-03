// Federation automatic rate sync permanently disabled.
// Dairy Owner will manage milk rates manually.

function initRateSyncCron() {
  console.log('Manual milk rate system enabled. Federation sync is disabled.');
}

module.exports = { initRateSyncCron };