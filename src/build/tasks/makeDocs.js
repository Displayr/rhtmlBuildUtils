const shell = require('shelljs')

module.exports = function (gulp) {
  return function (done) {
    const exitCode = shell.exec('r --no-save 2>/dev/null >/dev/null <<< "library(devtools); document()"').code
    const error = (exitCode === 0) ? null : new Error(`make docs failed with code ${exitCode}`)
    done(error)
  }
}
