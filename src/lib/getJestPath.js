const getBinPath = require('./getBinPath')

// Kept as a named wrapper so call sites and the existing tests read as before. The platform launcher
// and widget-repo-first lookup rules live in getBinPath, which the lint task shares.
module.exports = function getJestPath ({ buildRoot, widgetConfig }) {
  return getBinPath({ name: 'jest', buildRoot, widgetConfig })
}
