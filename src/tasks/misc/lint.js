const path = require('path')
const shell = require('shelljs')
const yargs = require('yargs')
const widgetConfig = require('../../lib/widgetConfig')
const getBinPath = require('../../lib/getBinPath')
const buildRoot = path.join(__dirname, '../../../')

// NB this task used to pipe gulp.src through gulp-eslint. gulp-eslint@5 is unmaintained and carries a
// hard dependency on eslint@^5, so it pinned the whole toolchain to eslint 5. Shelling out to the
// eslint CLI instead is what jestSpecTests.js and bin/prepush.js already do, and it turns the eslint
// major version into a package.json concern rather than a code concern.
//
// The file selection that used to live in the gulp.src glob now lives in eslint.config.base.js: flat
// config owns ignores, and eslint 10 has no .eslintignore. Passing '.' lets eslint apply them.
module.exports = () => {
  return function (done) {
    // args
    // * (--fix) apply fixable rules in place
    const args = parseCommandLineArguments()

    const eslintPath = getBinPath({ name: 'eslint', buildRoot, widgetConfig })
    const command = getCommandString({ eslintPath, args })

    console.log(`running ${command}`)

    return shell.exec(command, { async: true }, (exitCode) => {
      const error = (exitCode === 0) ? null : new Error(`${command} failed with code ${exitCode}`)
      done(error)
    })
  }
}

const getCommandString = ({ eslintPath, args }) => {
  const fix = (args.fix) ? '--fix' : ''
  // NB eslint --fix writes the fixed files itself, which is why this task no longer needs the
  // gulp-if / isFixed / gulp.dest('.') dance that gulp-eslint required to persist fixes.
  return `"${eslintPath}" . ${fix}`.trim()
}

const parseCommandLineArguments = () => {
  yargs.option('fix', {
    boolean: true,
    default: false,
    describe: 'apply fixable rules in place'
  })
  return yargs.parse()
}
