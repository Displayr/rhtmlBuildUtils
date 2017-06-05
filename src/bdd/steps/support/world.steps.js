const chai = require('chai')

// NB the World function is called first before every scenario. It runs before any of the registered 'Before' blocks
module.exports = function () {
  this.World = function () {
    this.context = {}
    this.expect = chai.expect
    browser.ignoreSynchronization = true
  }
  this.setDefaultTimeout(180 * 1000) // TODO configurable ?
}
