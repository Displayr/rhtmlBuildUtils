const shell = require('shelljs')

module.exports = function (gulp) {
  return function (done) {
    const commandString = 'r --no-save 2>/dev/null >/dev/null <<< "library(devtools); document()"'
    const exitCode = shell.exec(commandString).code
    if (exitCode !== 0) console.log(`make docs failed with code ${exitCode}. Command was '${commandString}'`)
    done(null) // don't trigger failure (e.g. if R is not installed)
  }
}
