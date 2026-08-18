// TODO address duplication between takeExperimentSnapshots/index.js and takeSnapshotsForEachTestDefinition/index.js

const colors = require('ansi-colors')
const _ = require('lodash')
const fs = require('fs')
const path = require('path')
const shell = require('shelljs')
const widgetConfig = require('../../../lib/widgetConfig')
const getJestPath = require('../../../lib/getJestPath')
const { registerTeardown } = require('../../../lib/teardown')
const buildSnapshotJestCommand = require('../../../lib/snapshotJestCommand')
const resolveAcceptNewSnapshots = require('../../../lib/resolveAcceptNewSnapshots')
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
    // NB also registered as a teardown, not only removed in the completion callback below. A Ctrl-C
    // during a long visual run, or a throw before the child spawns, would otherwise leave the file
    // behind -- and it is merged at HIGHER precedence than the widget config, so it would silently
    // reconfigure every later invocation. Removal is idempotent (force: true), so doing both is safe.
    registerTeardown('snapshot pass-through config', () => removePassThroughConfigFile({ widgetConfig }))
    // NB whether a missing baseline fails is decided here, not by the flag alone. A branch that has
    // never been baselined has no baselines by design -- sets are per branch and nothing seeds them
    // from master -- so being strict there would fail the whole suite on the first run of every
    // feature branch. See src/lib/resolveAcceptNewSnapshots.js.
    const { acceptNewSnapshots, seeding, setRoot } = resolveAcceptNewSnapshots({ widgetConfig, args })
    if (seeding) {
      console.log(`no baselines under ${setRoot}`)
      console.log(colors.yellow('seeding this snapshot set: every image will be WRITTEN and nothing compared'))
    }

    const command = buildSnapshotJestCommand({ testRoots, jestPath, args: { ...args, acceptNewSnapshots } })

    console.log(`running ${command}`)

    // NB this used to be followed by `setTimeout(() => process.exit(exitCode), 200)`, because the
    // connect task left a listening server behind and gulp would therefore never exit. That hack forced
    // this to be the LAST task in any sequence and put the process exit code in the hands of a task.
    // connect now registers its server with src/lib/teardown.js, so the runner closes it and owns the
    // exit code, and this task is free to appear anywhere in a sequence.
    return shell.exec(command, { async: true }, (exitCode) => {
      removePassThroughConfigFile({ widgetConfig })
      const error = (exitCode === 0) ? null : new Error(`${command} failed with code ${exitCode}`)
      done(error)
    })
  }
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

// The only reason this file exists is to carry command line values across a process boundary: this task
// shells out to jest, and jest propagates no arguments to the workers that actually read widgetConfig.
const passThroughConfigPath = ({ widgetConfig }) =>
  path.join(widgetConfig.basePath, '.tmp', 'snapshot_dynamic_config.json')

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
  fs.writeFileSync(passThroughConfigPath({ widgetConfig }), configString, 'utf8')
  if (ECHO_PASSTHROUGH_CONFIG) { console.log(`snapshot dynamic config: ${configString}`) }
}

// NB removed as soon as the jest run finishes, because widgetConfig merges this file at HIGHER precedence
// than the widget's own build/config/widget.config.js. Left behind, it silently reconfigures every LATER
// task that reads widgetConfig -- so a filtered run like
//
//     rhtml testVisual --env=local --branch=probe --snapshotDirectory=.tmp/probe
//
// left `rhtml reviewBaselines` pointing at .tmp/probe rather than the real snapshot tree, which is exactly
// when you need reviewBaselines to be right. It is a process-boundary hack, not ambient state, so it
// should not outlive the process it was written for.
const removePassThroughConfigFile = ({ widgetConfig }) => {
  // force: true so a run that never got as far as writing the file does not fail on the way out.
  fs.rmSync(passThroughConfigPath({ widgetConfig }), { force: true })
}
