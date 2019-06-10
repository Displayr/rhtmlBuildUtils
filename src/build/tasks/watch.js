const livereload = require('gulp-livereload')
const cliArgs = require('yargs').argv

const port = cliArgs.port || 9000
const liveReloadPort = 35729 + (parseInt(port) - 9000)

module.exports = function (gulp) {
  return function () {
    livereload.listen({ port: liveReloadPort })

    // watch for changes in the browser directory and reload chrome on changes
    gulp.watch([
      'browser/**/*'
    ]).on('change', livereload.changed)

    // when these files change then do this,
    // for example when the json file changes rerun the copy command
    gulp.watch(['theSrc/internal_www/**/*'], gulp.series('copy'))
    gulp.watch(['theSrc/internal_www/js/*.js', 'theSrc/scripts/*.js', 'theSrc/scripts/**/*.js'], gulp.series('compileRenderContentPage'))
    gulp.watch(['theSrc/internal_www/styles/**/.css'], gulp.series('copy'))
    gulp.watch('theSrc/styles/**/*.less', gulp.series('less'))
  }
}
