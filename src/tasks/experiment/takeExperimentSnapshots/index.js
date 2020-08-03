// TODO address duplication between takeExperimentSnapshots/index.js and takeSnapshotsForEachTestDefinition/index.js

const _ = require('lodash')
const shell = require('shelljs')
const fs = require('fs')
const path = require('path')
const widgetConfig = require('../../../lib/widgetConfig')
const { processTestPlans } = require('../../../lib/processTestPlans')
const getCommandLineArgs = require('./parseCommandLineArguments')
const buildRoot = path.join(__dirname, '..', '..', '..', '..')

const ECHO_PASSTHROUGH_CONFIG = true

module.exports = () => {
  return function (done) {
    const { name: experimentName, iteration: iterationFilter, baseline: runBaseline } = getCommandLineArgs()

    const experimentDirectory = path.join(widgetConfig.basePath, widgetConfig.experimentDirectory, experimentName)
    if (!fs.existsSync(experimentDirectory)) {
      throw new Error(`experiment directory "${experimentDirectory}" not found`)
    }

    const testPlanFile = path.join(widgetConfig.basePath, '.tmp', 'experimentTestPlan.json')
    const experimentResultsDirectory = path.join(experimentDirectory, 'results')
    const experimentConfigFile = path.join(experimentDirectory, 'experimentConfig')
    // NB takeExperimentSnapshots.jest.test.js is copied into <project_root>/.tmp (done by copyExperimentSnapshotJestRunnerToProject task)
    const experimentRunnerDirectory = path.join(widgetConfig.basePath, '.tmp')
    const experimentDynamicConfigFile = path.join(widgetConfig.basePath, '.tmp', 'experiment_dynamic_config.json')
    const experimentOverrideFile = path.join(widgetConfig.basePath, 'browser', 'config', 'experiment_variable_config.json')

    const setOverrides = (overrides) => {
      fs.writeFileSync(experimentOverrideFile, JSON.stringify(overrides), 'utf8')
    }

    const jestPath = getJestPath({ buildRoot, widgetConfig })

    const { baseline, experiments } = require(experimentConfigFile)
    const snapshotTestCommand = `${jestPath} --roots="${experimentRunnerDirectory}" --testMatch="**/takeExperimentSnapshots.jest.test.js"`
    processTestPlans(experimentDirectory, [testPlanFile])
      .then(() => {
        if (baseline && runBaseline) {
          console.log('running experiment config baseline')
          writePassThroughConfigFile({ experimentConfigName: 'baseline', experimentResultsDirectory, testPlanFile, experimentDynamicConfigFile })
          setOverrides(baseline.override)
          shell.exec(snapshotTestCommand)
        } else {
          console.log('skipping baseline')
        }

        for (let i = 0; i < experiments.length; i++) {
          const { name, override } = experiments[i]
          if (!iterationFilter || name === iterationFilter) {
            console.log(`running experiment config ${name}`)
            writePassThroughConfigFile({ experimentConfigName: name, experimentResultsDirectory, testPlanFile, experimentDynamicConfigFile })
            setOverrides(override)
            shell.exec(snapshotTestCommand)
          } else {
            console.log(`skipping experiment config ${name}`)
          }
        }
      })
      .then(() => done())
      .catch(error => done(error))
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

const writePassThroughConfigFile = ({ experimentConfigName, experimentResultsDirectory, testPlanFile, experimentDynamicConfigFile }) => {
  const configString = JSON.stringify({
    snapshotDirectory: path.join(experimentResultsDirectory, experimentConfigName),
    testPlanFile
  }, {}, 2)
  fs.writeFileSync(experimentDynamicConfigFile, configString, 'utf8')
  if (ECHO_PASSTHROUGH_CONFIG) { console.log(`experiment dynamic config: ${configString}`) }
}
