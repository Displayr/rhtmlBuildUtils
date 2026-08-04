const path = require('path')
const shell = require('shelljs')
const yargs = require('yargs')
const widgetConfig = require('../../lib/widgetConfig')
const getJestPath = require('../../lib/getJestPath')
const buildRoot = path.join(__dirname, '../../../')

module.exports = () => {
  return function (done) {
    // args
    // * (--testNamePattern -t) run subset of tests
    const args = parseCommandLineArguments()

    const testRoots = getTestRoots({ widgetConfig })
    const jestPath = getJestPath({ buildRoot, widgetConfig })
    const command = getCommandString({ testRoots, jestPath, args })

    console.log(`running ${command}`)

    return shell.exec(command, { async: true }, (exitCode) => {
      const error = (exitCode === 0) ? null : new Error(`${command} failed with code ${exitCode}`)
      done(error)
    })
  }
}

const getTestRoots = ({ widgetConfig }) => {
  const specTestPath = path.join(widgetConfig.basePath, widgetConfig.specTestingDirectory)
  return [
    specTestPath
  ]
}

const getCommandString = ({ testRoots, jestPath, args }) => {
  const roots = testRoots.map(root => `--roots="${root}"`).join(' ')
  const testNamePattern = (args.testNamePattern) ? `-t=${args.testNamePattern}` : ''
  // NB double quotes, not single: cmd.exe does not strip single quotes, so jest would receive them
  // as part of the pattern and match nothing. Double quotes work on both cmd.exe and posix shells.
  const testFilePattern = '--testMatch="**/*.jest.test.js"'

  return `"${jestPath}" ${roots} ${testFilePattern} ${testNamePattern}`
}

const parseCommandLineArguments = () => {
  yargs.option('testNamePattern', {
    alias: 't',
    string: true,
    describe: 'filter tests using pattern'
  })
  return yargs.parse()
}
