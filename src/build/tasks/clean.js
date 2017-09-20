const Promise = require('bluebird')
const fs = Promise.promisifyAll(require('fs-extra'))

module.exports = function (gulp) {
  return function (done) {
    const locationsToDelete = ['browser', 'inst', 'man', 'R', '.tmp']
    const deletePromises = locationsToDelete.map(function (location) { return fs.removeAsync(location) })
    Promise.all(deletePromises).then(function () { done() })
  }
}
