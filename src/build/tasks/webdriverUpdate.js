const gulpProtractor = require('gulp-protractor')

// TODO - need to detect which browser drivers are required - probably in protractor conf
module.exports = function (gulp) {
  return gulpProtractor.webdriver_update
}