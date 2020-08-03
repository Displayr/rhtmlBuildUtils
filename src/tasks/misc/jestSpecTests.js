const _ = require('lodash')
const fs = require('fs')
const path = require('path')
const shell = require('shelljs')
const yargs = require('yargs')
const widgetConfig = require('../../lib/widgetConfig')
const buildRoot = path.join(__dirname, '..', '..', '..')

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

// NB this alternation is done to support regular installs as well as "in dev" installs via npm link rhtmlBuildUtils
// TODO this is shared in two places
const getJestPath = ({ buildRoot, widgetConfig }) => {
  const jestPathCandidates = [
    path.join(widgetConfig.basePath, 'node_modules', '.bin', 'jest'),
    path.join(buildRoot, 'node_modules', '.bin', 'jest')
  ]

  const jestPath = _.find(jestPathCandidates, fs.existsSync)
  if (!jestPath) {
    throw new Error(`Could not find jest at these locations: ${jestPathCandidates.join(',')}`)
  }
  return jestPath
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
  const testFilePattern = "--testMatch='**/*.jest.test.js'"

  return `${jestPath} ${roots} ${testFilePattern} ${testNamePattern}`
}

const parseCommandLineArguments = () => {
  yargs.option('testNamePattern', {
    alias: 't',
    string: true,
    describe: 'filter tests using pattern'
  })
  return yargs.parse()
}
