const _ = require('lodash')
const fs = require('fs')
const path = require('path')

// NB on windows npm creates two launchers in node_modules/.bin: an extensionless sh script and a
// .cmd wrapper. The extensionless file exists on windows too, so checking for it succeeds and then
// cmd.exe cannot execute it. Pick the launcher that the current platform's shell can actually run.
const jestBinaryName = (process.platform === 'win32') ? 'jest.cmd' : 'jest'

// NB this alternation is done to support regular installs as well as "in dev" installs via npm link rhtmlBuildUtils
module.exports = function getJestPath ({ buildRoot, widgetConfig }) {
  const jestPathCandidates = [
    path.join(widgetConfig.basePath, 'node_modules', '.bin', jestBinaryName),
    path.join(buildRoot, 'node_modules', '.bin', jestBinaryName)
  ]

  const jestPath = _.find(jestPathCandidates, fs.existsSync)
  if (!jestPath) {
    throw new Error(`Could not find jest at these locations: ${jestPathCandidates.join(',')}`)
  }
  return jestPath
}
