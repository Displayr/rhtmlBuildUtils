const livereload = require('gulp-livereload')

module.exports = function (gulp) {
  return function () {
    livereload.listen()

    // watch for changes in the browser directory and reload chrome on changes
    gulp.watch([
      'browser/**/*'
    ]).on('change', livereload.changed)

    // when these files change then do this,
    // for example when the json file changes rerun the copy command
    gulp.watch(['theSrc/internal_www/**/*', '!theSrc/internal_www/**/*.js'], ['copy'])
    gulp.watch(['theSrc/internal_www/js/*.js', 'theSrc/scripts/*.js', 'theSrc/scripts/**/*.js'], ['compileRenderContentPage'])
    gulp.watch('theSrc/styles/**/*.less', ['less'])
  }
}
