const path = require('path')

const jestRunnerPath = path.join(__dirname, '..', 'assets', 'takeExperimentSnapshots.jest.test.js')

module.exports = (gulp) => {
  return function (done) {
    gulp.src([jestRunnerPath], {})
      .pipe(gulp.dest('.tmp'))
      .on('finish', done)
  }
}
