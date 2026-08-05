const opn = require('opn')
const yargs = require('yargs')

// NB this was defined inline in src/index.js under gulp, as the one task that was not a module in a
// task directory. It is a module now so that the runner's directory scan finds it like every other
// task, and so `rhtml openBrowser` works on its own.
module.exports = () => {
  return function (done) {
    const port = yargs.parse().port || 9000
    opn(`http://localhost:${port}`)
    done()
  }
}
