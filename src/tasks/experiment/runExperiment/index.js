const shell = require('shelljs')
const fs = require('fs')
const path = require('path')
const widgetConfig = require('../../../lib/widgetConfig')
const { processTestPlans } = require('../../../lib/processTestPlans')
const getCommandLineArgs = require('./parseCommandLineArguments')

const ECHO_PASSTHROUGH_CONFIG = 1

// NB must work around this issue : https://github.com/facebook/jest/issues/2145
const jestAllowTestInNodeModulesConfigPath = path.join(__dirname, '../../../lib/jest.allow_tests_in_node_modules_directory.js')

module.exports = () => {
  return function (done) {
    const { name: experimentName } = getCommandLineArgs()
    const experimentDirectory = path.join(widgetConfig.basePath, widgetConfig.experimentDirectory, experimentName)
    if (!fs.existsSync(experimentDirectory)) {
      throw new Error(`experiment directory "${experimentDirectory}" not found`)
    }

    const testPlanFile = path.join(widgetConfig.basePath, '.tmp/experimentTestPlan.json')
    const experimentResultsDirectory = path.join(experimentDirectory,  'results')
    const experimentConfigFile = path.join(experimentDirectory, 'experimentConfig')
    const experimentRunnerDirectory = __dirname
    const experimentDynamicConfigFile = path.join(widgetConfig.basePath, '.tmp', 'experiment_dynamic_config.json')
    const experimentOverrideFile = path.join(widgetConfig.basePath, 'browser/config/experiment_variable_config.json')

    const writePassThroughConfigFile = (experimentConfigName) => {
      const configString = JSON.stringify({ snapshotDirectory: path.join(experimentResultsDirectory, experimentConfigName), testPlanFile }, {}, 2)
      fs.writeFileSync(experimentDynamicConfigFile, configString, 'utf8')
      if (ECHO_PASSTHROUGH_CONFIG) { console.log(`experiment dynamic config: ${configString}`) }
    }

    const setOverrides = (overrides) => {
      fs.writeFileSync(experimentOverrideFile, JSON.stringify(overrides), 'utf8')
    }

    const { baseline, experiments } = require(experimentConfigFile)
    const snapshotTestCommand = `jest --roots="${experimentRunnerDirectory}" --config=${jestAllowTestInNodeModulesConfigPath} --testMatch="**/jestRunner.js"`
    processTestPlans(experimentDirectory, [testPlanFile])
      .then(() => {
        if (baseline) {
          console.log('running experiment config baseline')
          writePassThroughConfigFile('baseline')
          setOverrides(baseline.override)
          shell.exec(snapshotTestCommand)
        } else {
          console.log('skipping baseline')
        }

        for (let i = 0; i < experiments.length; i++) {
          const { name, override } = experiments[i]
          console.log(`running experiment config ${name}`)
          writePassThroughConfigFile(name)
          setOverrides(override)
          shell.exec(snapshotTestCommand)
        }

      })
      .then(() => done())
      .catch(error => done(error))
  }
}