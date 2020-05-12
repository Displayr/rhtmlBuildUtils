const { experimentDirectory } = require('../../../lib/widgetConfig')
const path = require('path')

module.exports = (gulp) => {
  return function (done) {
    let finishedCount = 0
    const requiredCount = 2
    const incrementFinishedCount = () => finishedCount++

    gulp.src([`${experimentDirectory}/**/*`], {})
      .pipe(gulp.dest('browser/experiments'))
      .on('finish', incrementFinishedCount)

    gulp.src([`${path.join(__dirname, '../assets/ui')}/**/*.html`, `${path.join(__dirname, '../assets')}/**/*.css`], {})
      .pipe(gulp.dest('browser/experiments/ui'))
      .on('finish', incrementFinishedCount)

    const intervalHandle = setInterval(() => {
      if (finishedCount >= requiredCount) {
        clearInterval(intervalHandle)
        done()
      }
    }, 20)
  }
}
