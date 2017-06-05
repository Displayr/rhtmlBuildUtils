const gulpProtractor = require('gulp-protractor')
const gulpExit = require('gulp-exit')
const path = require('path')
const cliArgs = require('yargs').argv
const _ = require('lodash')

module.exports = function (gulp) {
  return function (done) {
    const args = []
    if (cliArgs.testLabel) {
      args.push(`--params.testLabel=${cliArgs.testLabel}`)
    } else {
      args.push('--params.testLabel=Default')
    }

    // --cucumberOpts.tags @a,@b to run scenarios marked @a or @b
    // --cucumberOpts.tags @a --cucumberOpts.tags @b to run scenarios marked @a and @b
    if (cliArgs.tags) {
      const tags = (_.isArray(cliArgs.tags)) ? cliArgs.tags : [cliArgs.tags]
      _(tags).each(tag => args.push(`--cucumberOpts.tags=${tag}`))
    }

    if (_.has(cliArgs, 'applitools') && !cliArgs.applitools) {
      args.push('--params.applitools=off')
    }

    if (cliArgs.logs) {
      args.push('--params.logs')
    }

    gulp.src(['.tmp/snapshots.feature', 'bdd/features/**/*.feature'])
      .pipe(gulpProtractor.protractor({
        configFile: path.join(__dirname, '../config/protractor.conf.js'),
        args
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
