const _ = require('lodash')
const fs = require('fs')
const path = require('path')

// NB on windows npm creates two launchers in node_modules/.bin: an extensionless sh script and a
// .cmd wrapper. The extensionless file exists on windows too, so checking for it succeeds and then
// cmd.exe cannot execute it. Pick the launcher that the current platform's shell can actually run.
const launcherName = (name) => (process.platform === 'win32') ? `${name}.cmd` : name

// NB the alternation is done to support regular installs as well as "in dev" installs via
// npm link rhtmlBuildUtils. The widget repo's own install wins, so a widget can pin its own version.
module.exports = function getBinPath ({ name, buildRoot, widgetConfig }) {
  const candidates = [
    path.join(widgetConfig.basePath, 'node_modules', '.bin', launcherName(name)),
    path.join(buildRoot, 'node_modules', '.bin', launcherName(name))
  ]

  const binPath = _.find(candidates, fs.existsSync)
  if (!binPath) {
    throw new Error(`Could not find ${name} at these locations: ${candidates.join(',')}`)
  }
  return binPath
}
