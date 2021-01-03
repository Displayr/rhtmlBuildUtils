const shell = require('shelljs')

module.exports = function (gulp) {
  return function (done) {
    const commandString = 'r --no-save 2>/dev/null >/dev/null <<< "library(devtools); document()"'
    const exitCode = shell.exec(commandString).code
    const callbackResponse = (exitCode === 0) ? null : new Error(`make docs failed with code ${exitCode}. Command was '${commandString}'`)
    done(callbackResponse)
  }
}
