const path = require('path')
const karma = require('karma')

module.exports = function (gulp) {
  return function (done) {
    const Server = karma.Server
    new Server({
      configFile: path.join(__dirname, '../config/karma.conf.js'),
      singleRun: true
    }, done).start()
  }
}
