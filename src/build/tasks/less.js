const less = require('gulp-less')

module.exports = function (gulp) {
  return function () {
    return gulp.src('theSrc/styles/**/*.less')
      .pipe(less({}))
      .pipe(gulp.dest('browser/styles'))
      .pipe(gulp.dest('inst/htmlwidgets/lib/style'))
  }
}
