// TODO address duplication between takeExperimentSnapshots/index.js and takeSnapshotsForEachTestDefinition/index.js

const _ = require('lodash')
const fs = require('fs')
const path = require('path')
const shell = require('shelljs')
const widgetConfig = require('../../../lib/widgetConfig')
const getCommandLineArgs = require('./parseCommandLineArguments')
const buildRoot = path.join(__dirname, '../../../../')

const ECHO_PASSTHROUGH_CONFIG = true

module.exports = () => {
  return function (done) {
    // args
    // * (--acceptNewSnapshots) accept new snapshots
    // * (--branch) which branch
    // * (--env) which env (local or travis)
    // * (--headless) headless: --snapshotTesting.puppeteer.headless=0
    // * (--log) echo browser log output
    // * (--slowMo) slowmotion: --snapshotTesting.puppeteer.slowMo=60
    // * (--snapshotDirectory) snapshots directory
    // * (--testNamePattern -t) run subset of tests
    // * (--updateSnapshots -u) accept all snapshots
    const args = getCommandLineArgs()

    const testRoots = getTestRoots({ buildRoot, widgetConfig })
    const jestPath = getJestPath({ buildRoot, widgetConfig })

    writePassThroughConfigFile({ widgetConfig, args })
    const command = getCommandString({ testRoots, jestPath, args })

    console.log(`running ${command}`)

    return shell.exec(command, { async: true }, (exitCode) => {
      const error = (exitCode === 0) ? null : new Error(`${command} failed with code ${exitCode}`)
      done(error)

      /* connect is leaving the server running, so gulp will not exit. This is a hacky way of getting gulp to exit and maintaining the test exit code
       * Main issue I can see with this approach is that now jestSnapshotTests MUST be the last task to run
       * Note that runProtractor.js handled this by properly using gulp streams and then piping to gulpExit
       */
      setTimeout(() => {
        process.exit(exitCode)
      }, 200)
    })
  }
}

// NB this alternation is done to support regular installs as well as "in dev" installs via npm link rhtmlBuildUtils
// TODO this is shared in two places
const getJestPath = ({ buildRoot, widgetConfig }) => {
  const jestPathCandidates = [
    path.join(widgetConfig.basePath, 'node_modules/.bin/jest'),
    path.join(buildRoot, 'node_modules/.bin/jest')
  ]

  const jestPath = _.find(jestPathCandidates, fs.existsSync)
  if (!jestPath) {
    throw new Error(`Could not find jest at these locations: ${jestPathCandidates.join(',')}`)
  }
  return jestPath
}

const getTestRoots = ({ buildRoot, widgetConfig }) => {
  // NB takeSnapshots.jest.test.js is copied into <project_root>/.tmp (done by copySnapshotJestRunnerToProject task)
  const takeSnapshotForEachTestDefinition = path.join(widgetConfig.basePath, '.tmp')
  const interactionTestPath = path.join(widgetConfig.basePath, widgetConfig.snapshotTesting.interactionTestDirectory)
  return [
    takeSnapshotForEachTestDefinition,
    interactionTestPath
  ]
}

const getCommandString = ({ testRoots, jestPath, args }) => {
  const roots = testRoots.map(root => `--roots="${root}"`).join(' ')
  const acceptNewSnapshots = (args.acceptNewSnapshots) ? `--ci=0` : ''
  const testNamePattern = (args.testNamePattern) ? `-t=${args.testNamePattern}` : ''
  const testFilePattern = "--testMatch='**/*.jest.test.js'"
  const updateSnapshots = (args.updateSnapshots) ? `-u` : ''

  return `${jestPath} ${roots} ${testFilePattern} ${acceptNewSnapshots} ${updateSnapshots} ${testNamePattern}`
}

const writePassThroughConfigFile = ({ widgetConfig, args }) => {
  const dynamicSnapshotConfig = _.pick(args, ['branch', 'env', 'snapshotDirectory'])

  dynamicSnapshotConfig.puppeteer = {}
  if (_.has(args, 'headless')) {
    dynamicSnapshotConfig.puppeteer.headless = args.headless
  }
  if (_.has(args, 'slowMo')) {
    dynamicSnapshotConfig.puppeteer.slowMo = args.slowMo
  }

  const configString = JSON.stringify(dynamicSnapshotConfig, {}, 2)
  fs.writeFileSync(path.join(widgetConfig.basePath, '.tmp', 'snapshot_dynamic_config.json'), configString, 'utf8')
  if (ECHO_PASSTHROUGH_CONFIG) { console.log(`snapshot dynamic config: ${configString}`) }
}
