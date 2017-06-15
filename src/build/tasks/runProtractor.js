const gulpProtractor = require('gulp-protractor')
const gulpExit = require('gulp-exit')
const path = require('path')
const cliArgs = require('yargs').argv
const _ = require('lodash')
const dot = require('dot-object')

const widgetConfig = require('../lib/widgetConfig')

function convertObjectToArrayOfParams (configObject) {
  const keysConvertedToDotNotation = dot.dot({ params: configObject })
  const arrayOfProtractorParams = _.transform(keysConvertedToDotNotation, (result, value, param) => {
    result.push(`--${param}=${value}`)
  }, [])
  return arrayOfProtractorParams
}

module.exports = function (gulp) {
  return function (done) {
    const commandLineOverides = _.omit(cliArgs, ['tags', '_', '$0'])
    const protractorParamsObject = _.merge(widgetConfig.visualRegressionSuite, commandLineOverides)
    const protractorParamsArray = convertObjectToArrayOfParams(protractorParamsObject)

    // NB --cucumberOpts.tags @a,@b to run scenarios marked @a or @b
    // NB --cucumberOpts.tags @a --cucumberOpts.tags @b to run scenarios marked @a and @b
    if (cliArgs.tags) {
      const tags = (_.isArray(cliArgs.tags)) ? cliArgs.tags : [cliArgs.tags]
      _(tags).each(tag => protractorParamsArray.push(`--cucumberOpts.tags=${tag}`))
    }

    gulp.src(['.tmp/snapshots.feature', 'bdd/features/**/*.feature'])
      .pipe(gulpProtractor.protractor({
        configFile: path.join(__dirname, '../config/protractor.conf.js'),
        args: protractorParamsArray
      }))
      .on('error', function (err) {
        throw err
      })
      .on('end', function () {
        done()
      })
      .pipe(gulpExit())
  }
}
