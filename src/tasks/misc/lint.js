const gulpIf = require('gulp-if')
const eslint = require('gulp-eslint')
const cliArgs = require('yargs').argv

// TODO add support for dont fail on eslint

const fix = !!(cliArgs.fix)

function isFixed (file) {
  return file.eslint != null && file.eslint.fixed
}

module.exports = function (gulp) {
  return function (done) {
    return gulp.src([
      '**/*.js',
      '!node_modules/**',
      '!browser/**',
      '!docs/**',
      '!examples/**',
      '!inst/**'
    ])
      .pipe(eslint({ fix }))
      .pipe(eslint.format())
      .pipe(gulpIf(isFixed, gulp.dest('.')))
      .pipe(eslint.failAfterError())
      .on('finish', done)
  }
}
