// TODO address duplication between takeExperimentSnapshots.jest.test.js and takeSnapshots.jest.test

const _ = require('lodash')
const path = require('path')
const puppeteer = require('puppeteer')
const {
  widgetConfig,
  snapshotTesting: {
    renderExamplePageTestHelper: {
      baseConfigureImageSnapshotMatcher,
      puppeteerSettings,
      jestTimeout,
      testSnapshots,
      waitForWidgetToLoad
    }
  }
} = require('rhtmlBuildUtils')

const experimentDynamicConfigFile = path.join(widgetConfig.basePath, '.tmp/experiment_dynamic_config.json')
const { snapshotDirectory, testPlanFile } = require(experimentDynamicConfigFile)
const testPlan = require(testPlanFile)
jest.setTimeout(jestTimeout)

const arrayOfTests = _(testPlan)
  .map(({ tests, groupName }) => {
    return tests.map(testConfig => _.assign(testConfig, { groupName }))
  })
  .flatten()
  .map(testConfig => [`${testConfig.groupName}-${testConfig.testname}`, testConfig])
  .value()

describe('snapshots', () => {
  let browser

  beforeEach(async () => {
    browser = await puppeteer.launch(puppeteerSettings)
  })

  afterEach(async () => {
    await browser.close()
  })

  // NB on test naming
  // jest test name = group + testname <-- allows us to filter by group or by name
  // snapshot name = testname <-- the group name is in the directory so group does not need to be repeated in the snapshot name
  test.each(arrayOfTests)(`%#: %s`, async (testNameWithGroupName, testConfig) => {
    const testNameWithoutGroupName = testConfig.testname
    baseConfigureImageSnapshotMatcher(snapshotDirectory)

    const page = await browser.newPage()

    page.on('console', (msg) => widgetConfig.snapshotTesting.consoleLogHandler(msg, testNameWithGroupName))
    await page.goto(`http://localhost:9000${testConfig.renderExampleUrl}`)
    await waitForWidgetToLoad({ page })
    await testSnapshots({ page, testName: testNameWithoutGroupName, snapshotNames: testConfig.widgets.map(({ title }) => title) })

    await page.close()
  })

  afterAll(async () => {
    await browser.close()
  })
})
