const rename = require('gulp-rename')

const widgetConfig = require('../lib/widgetConfig')

module.exports = function (gulp) {
  return function () {
    //  TODO this needs a return signalling all the copying is done
    gulp.src([
      'theSrc/internal_www/**/*'
    ], {}).pipe(gulp.dest('browser'))

    gulp.src([
      'theSrc/images/**/*'
    ], {}).pipe(gulp.dest('browser/images'))

    gulp.src([
      'theSrc/styles/**/*.css'
    ], {})
      .pipe(gulp.dest('inst/htmlwidgets/lib/style'))
      .pipe(gulp.dest('browser/style'))

    gulp.src([
      'theSrc/internal_www/styles/**/*.css'
    ], {})
      .pipe(gulp.dest('browser/style'))

    gulp.src('theSrc/R/htmlwidget.yaml')
      .pipe(rename(`${widgetConfig.widgetName}.yaml`))
      .pipe(gulp.dest('inst/htmlwidgets/'))

    gulp.src('theSrc/R/htmlwidget.R')
      .pipe(rename(`${widgetConfig.widgetName}.R`))
      .pipe(gulp.dest('R/'))

    gulp.src(['theSrc/R/*.R', '!theSrc/R/htmlwidget.R'])
      .pipe(gulp.dest('R/'))

    // only used directly in browser by renderExample.html
    const internalWebServerDependencies = [
      'node_modules/lodash/lodash.min.js',
      'node_modules/jquery/dist/jquery.min.js'
    ]

    gulp.src(internalWebServerDependencies)
      .pipe(gulp.dest('browser/internal_www/external/'))
  }
}
