
module.exports = () => {
  return function (done) {

    const shell = require('shelljs')
    const fs = require('fs')
    const path = require('path')
    const widgetConfig = require('../../build/lib/widgetConfig')
    const { processTestPlans } = require('../lib/processTestPlans')

    const ECHO_PASSTHROUGH_CONFIG = 1

    const runBaseline = true // TODO make this configurable
    const runExperiment = true // TODO make this configurable
    const experimentName = 'varyFonts' // TODO make this configurable



    // NB must work around this issue : https://github.com/facebook/jest/issues/2145
    const jestAllowTestInNodeModulesConfigPath = path.join(__dirname, '../config/jest.allow_tests_in_node_modules_directory.js')

    const experimentDirectory = path.join(widgetConfig.basePath, widgetConfig.experimentDirectory, experimentName)
    const resultsDirectory = path.join(experimentDirectory,  'results')
    const testPlanFile = path.join(experimentDirectory, 'testPlan.json')
    const experimentConfigFile = path.join(experimentDirectory, 'experimentConfig')
    const experimentRunnerDirectory = path.join(__dirname, '../jestSuites')
    const experimentDynamicConfigFile = path.join(widgetConfig.basePath, '.tmp', 'experiment_dynamic_config.json')
    const labelOverrideFile = path.join(widgetConfig.basePath, 'browser/config/experiment_variable_config.json')

// const silentString = (true) ? ' 2> /dev/null > /dev/null' : ''
    const snapshotTestCommand = `jest --roots="${experimentRunnerDirectory}" --config=${jestAllowTestInNodeModulesConfigPath} --testMatch="**/takeExperimentSnapshots.js"`


    const writePassThroughConfigFile = ({ snapshotDirectory }) => {
      const configString = JSON.stringify({ snapshotDirectory, testPlanFile }, {}, 2)
      fs.writeFileSync(experimentDynamicConfigFile, configString, 'utf8')
      if (ECHO_PASSTHROUGH_CONFIG) { console.log(`experiment dynamic config: ${configString}`) }
    }

    const setOverrides = (overrides) => {
      fs.writeFileSync(labelOverrideFile, JSON.stringify(overrides), 'utf8')
    }

    const start = Date.now()
    const secondsSinceStart = () => `${((Date.now() - start) / 1000).toFixed(0)}s`
    const { baseline, experiments } = require(experimentConfigFile)
    processTestPlans(experimentDirectory, [testPlanFile])
      .then(() => {
        if (runBaseline) {
          console.log(secondsSinceStart(), 'running baseline')
          writePassThroughConfigFile({ snapshotDirectory: `${resultsDirectory}/baseline` })
          setOverrides(baseline.override)
          shell.exec(snapshotTestCommand)
        } else {
          console.log(secondsSinceStart(), 'skipping baseline')
        }

        if (runExperiment) {
          for (let i = 0; i < experiments.length; i++) {
            const { name, override } = experiments[i]
            console.log(secondsSinceStart(), `running experiment ${name}`)
            writePassThroughConfigFile({ snapshotDirectory: `${resultsDirectory}/${name}` })
            setOverrides(override)
            shell.exec(snapshotTestCommand)
          }
        } else {
          console.log(secondsSinceStart(), 'skipping experiments')
        }
      })
      .then(() => done())
      .catch(error => done(error))

  }
}