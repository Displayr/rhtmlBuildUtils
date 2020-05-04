const _ = require('lodash')
const path = require('path')
const puppeteer = require('puppeteer')

const widgetConfig = require('../../../build/lib/widgetConfig')
const experimentDynamicConfigFile = path.join(widgetConfig.basePath, '.tmp', 'experiment_dynamic_config.json')
const { snapshotDirectory, testPlanFile } = require(experimentDynamicConfigFile)
const testPlan = require(testPlanFile)

const {
  baseConfigureImageSnapshotMatcher,
  puppeteerSettings,
  jestTimeout,
  testSnapshots,
  waitForWidgetToLoad
} = require('../../lib/renderExamplePageTest.helper')

jest.setTimeout(jestTimeout)

const arrayOfTests = _(testPlan)
  .map(({ tests, groupName }) => {
    return tests.map(testConfig => _.assign(testConfig, { groupName }))
  })
  .flatten()
  .map(testConfig => [`${testConfig.groupName}-${testConfig.testname}`, testConfig])
  .value()

// on test naming
// jest test name = group + testname <-- allows us to filter by group or by name
// snapshot name = testname <-- the group name is in the directory so group does not need to be repeated in the snapshot name

describe('snapshots', () => {
  let browser

  beforeEach(async () => {
    browser = await puppeteer.launch(puppeteerSettings)
  })

  afterEach(async () => {
    await browser.close()
  })

  test.each(arrayOfTests)(`%#: %s`, async (testName, testConfig) => {
    console.log(testName)

    baseConfigureImageSnapshotMatcher(snapshotDirectory)

    const page = await browser.newPage()

    page.on('console', (msg) => widgetConfig.snapshotTesting.consoleLogHandler(msg, testName))
    await page.goto(`http://localhost:9000${testConfig.renderExampleUrl}`)
    await waitForWidgetToLoad({ page })
    await testSnapshots({ page, snapshotName: testConfig.testname })

    await page.close()
  })

  afterAll(async () => {
    await browser.close()
  })
})
