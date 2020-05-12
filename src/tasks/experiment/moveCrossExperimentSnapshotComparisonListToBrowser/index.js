const path = require('path')

const { basePath, experimentDirectory } = require('../../../lib/widgetConfig')

module.exports = function (gulp) {
  return function (done) {
    gulp.src([path.join(basePath, experimentDirectory, 'crossExperimentSnapshotComparisons.yaml')], {})
      .pipe(gulp.dest('browser/content'))
      .on('finish', done)
  }
}
