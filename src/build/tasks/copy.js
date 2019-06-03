const rename = require('gulp-rename')
const widgetConfig = require('../lib/widgetConfig')

// TODO the method for knowing when we are done is crude and
// relies on author to keep requiredCount and all calls to incrementFinishCount up to date

module.exports = function (gulp) {
  return function (done) {
    let finishedCount = 0
    const requiredCount = 8
    const incrementFinishedCount = () => finishedCount++

    gulp.src([
      'theSrc/internal_www/**/*'
    ], {})
      .pipe(gulp.dest('browser'))
      .on('finish', incrementFinishedCount)

    gulp.src([
      'theSrc/images/**/*'
    ], {})
      .pipe(gulp.dest('browser/images'))
      .on('finish', incrementFinishedCount)

    gulp.src([
      'theSrc/styles/**/*.css'
    ], {})
      .pipe(gulp.dest('inst/htmlwidgets/lib/style'))
      .pipe(gulp.dest('browser/style'))
      .on('finish', incrementFinishedCount)

    gulp.src([
      'theSrc/internal_www/styles/**/*.css'
    ], {})
      .pipe(gulp.dest('browser/style'))
      .on('finish', incrementFinishedCount)

    gulp.src('theSrc/R/htmlwidget.yaml')
      .pipe(rename(`${widgetConfig.widgetName}.yaml`))
      .pipe(gulp.dest('inst/htmlwidgets/'))
      .on('finish', incrementFinishedCount)

    gulp.src('theSrc/R/htmlwidget.R')
      .pipe(rename(`${widgetConfig.widgetName}.R`))
      .pipe(gulp.dest('R/'))
      .on('finish', incrementFinishedCount)

    gulp.src(['theSrc/R/*.R', '!theSrc/R/htmlwidget.R'])
      .pipe(gulp.dest('R/'))
      .on('finish', incrementFinishedCount)

    // only used directly in browser by renderExample.html
    const internalWebServerDependencies = [
      'node_modules/lodash/lodash.min.js',
      'node_modules/jquery/dist/jquery.min.js'
    ]

    gulp.src(internalWebServerDependencies)
      .pipe(gulp.dest('browser/internal_www/external/'))
      .on('finish', incrementFinishedCount)

    const intervalHandle = setInterval(() => {
      if (finishedCount >= requiredCount) {
        clearInterval(intervalHandle)
        done()
      }
    }, 20)
  }
}
