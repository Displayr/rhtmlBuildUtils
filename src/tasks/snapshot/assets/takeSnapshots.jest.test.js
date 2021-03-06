// TODO address duplication between takeExperimentSnapshots.jest.test.js and takeSnapshots.jest.test

const _ = require('lodash')
const puppeteer = require('puppeteer')
const {
  widgetConfig,
  snapshotTesting: {
    renderExamplePageTestHelper: {
      configureImageSnapshotMatcher,
      puppeteerSettings,
      jestTimeout,
      testSnapshots,
      waitForWidgetToLoad
    }
  }
} = require('rhtmlBuildUtils')

// NB assume test_plan is in <project_root>/.tmp
// NB assume that this file is copied into <project_root>/.tmp (done by copySnapshotJestRunnerToProject task)
// we have to copy this test file into place in the project because JEST really does not want to run jest test files that are inside node_modules directory.
//   and rhtmlBuildUtils will be in the node_modules directory for the widget being tested

const testPlan = require('./test_plan') // NB assume test_plan is in <project_root>/.tmp

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
    configureImageSnapshotMatcher({
      collectionIdentifier: ['testPlans', testConfig.groupName],
      pixelMatchConfig: (testConfig.pixelmatchConfig) ? testConfig.pixelmatchConfig : {}
    })

    const page = await browser.newPage()
    page.on('console', (msg) => widgetConfig.snapshotTesting.consoleLogHandler(msg, testNameWithGroupName))
    await page.goto(`http://localhost:9000${testConfig.renderExampleUrl}`)
    await waitForWidgetToLoad({ page })
    await page.waitFor(widgetConfig.snapshotTesting.snapshotDelay)
    await testSnapshots({ page, testName: testNameWithoutGroupName, snapshotNames: testConfig.widgets.map(({ title }) => title) })
    await page.close()
  })

  afterAll(async () => {
    await browser.close()
  })
})
