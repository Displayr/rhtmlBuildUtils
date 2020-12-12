const _ = require('lodash')
const deepDiff = require('deep-diff')
const { mkdirp } = require('fs-extra')
const path = require('path')
const request = require('request-promise')
const { configureToMatchImageSnapshot } = require('jest-image-snapshot')
const widgetConfig = require('./widgetConfig')

const configureImageSnapshotMatcher = ({ collectionIdentifier, pixelMatchConfig = {} } = {}) => {
  const collectionParts = (_.isArray(collectionIdentifier)) ? collectionIdentifier : [collectionIdentifier]
  const snapshotDirectory = path.join(
    widgetConfig.basePath,
    widgetConfig.snapshotTesting.snapshotDirectory,
    widgetConfig.snapshotTesting.env,
    widgetConfig.snapshotTesting.branch,
    ...collectionParts
  )
  return baseConfigureImageSnapshotMatcher(snapshotDirectory, pixelMatchConfig)
}

const baseConfigureImageSnapshotMatcher = (snapshotDirectory, pixelMatchConfig) => {
  console.log('snapshotDirectory', snapshotDirectory)
  mkdirp(snapshotDirectory)
  const config = _.defaults({}, pixelMatchConfig, widgetConfig.snapshotTesting.pixelmatch, { customSnapshotsDir: snapshotDirectory })
  const toMatchImageSnapshot = configureToMatchImageSnapshot(config)
  expect.extend({ toMatchImageSnapshot })
}

const getExampleUrl = ({ configName, stateName, width = 1000, height = 1000, rerenderControls = false, border = false }) => {
  const config = {
    height,
    width,
    type: 'single_widget_single_page',
    widgets: [{ config: [configName],
      rerenderControls,
      border,
      state: stateName
    }]
  }
  const configString = new Buffer(JSON.stringify(config)).toString('base64') // eslint-disable-line node/no-deprecated-api
  return `http://localhost:9000/renderExample.html?config=${configString}`
}

const waitForWidgetToLoad = async ({ page }) => page.waitForFunction(selectorString => {
  return document.querySelectorAll(selectorString).length
}, { timeout: widgetConfig.snapshotTesting.timeout }, 'body[widgets-ready], .rhtml-error-container')

const testState = async ({ page, stateName, tolerance }) => {
  let stateIsGood = await checkState({ page, expectedStateFile: stateName, tolerance })
  expect(stateIsGood).toEqual(true)
}

const checkState = async ({ page, expectedStateFile, tolerance: toleranceString }) => {
  return new Promise((resolve, reject) => {
    const expectedStateUrl = `http://localhost:9000/${replaceDotsWithSlashes(expectedStateFile)}.json`

    const { statePreprocessor } = widgetConfig.internalWebSettings
    const expectedStatePromise = request(expectedStateUrl).then(JSON.parse)
    const actualStatePromise = getRecentState(page)

    return Promise.all([actualStatePromise, expectedStatePromise]).then(([unprocessedActualState, expectedState]) => {
      const actualState = statePreprocessor(unprocessedActualState)
      const bothNumber = (a, b) => (typeof a) === 'number' && (typeof b) === 'number'
      const tolerance = (_.isUndefined(toleranceString)) ? 0 : parseFloat(toleranceString)
      const areEqual = _.isEqualWith(actualState, expectedState, (a, b) => {
        if (bothNumber(a, b)) {
          return Math.abs(a - b) <= tolerance
        }
        return undefined
      })

      if (!areEqual) {
        console.log('actualState')
        console.log(JSON.stringify(actualState, {}, 2))

        console.log('expectedState')
        console.log(JSON.stringify(expectedState, {}, 2))

        console.log('differences (left: actual, right: expected)')
        console.log(JSON.stringify(deepDiff(actualState, expectedState), {}, 2))
      }
      return resolve(areEqual)
    })
  })
}

const replaceDotsWithSlashes = (inputString) => {
  return inputString.replace(/[.]/g, '/')
}

const getRecentState = async function (page) {
  function getStateUpdates () {
    if (typeof window.stateUpdates !== 'undefined') {
      return window.stateUpdates
    } else {
      throw new Error('no stateUpdates on window object. Widget lib must implement stateUpdates')
    }
  }

  return page.evaluate(getStateUpdates).then((stateUpdates) => {
    return stateUpdates[stateUpdates.length - 1]
  })
}

const testSnapshots = async ({ page, testName, snapshotNames = null }) => {
  await page.waitFor(widgetConfig.snapshotTesting.snapshotDelay)
  let widgets = await page.$$(widgetConfig.internalWebSettings.singleWidgetSnapshotSelector)
  console.log(`taking ${widgets.length} snapshot(s) for ${testName}`)

  const getSnapshotName = (index) => {
    if (widgets.length === 1) { return testName }
    const snapshotName = _.get(snapshotNames, `[${index}]`, `${index + 1}`)
    const filesystemSafeSnapshotName = snapshotName.replace(/ /g, '_').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()
    return `${testName}-${filesystemSafeSnapshotName}`
  }

  async function asyncForEach (array, callback) {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array)
    }
  }

  await asyncForEach(widgets, async (widget, index) => {
    let image = await widget.screenshot({})
    expect(image).toMatchImageSnapshot({ customSnapshotIdentifier: getSnapshotName(index) })
  })
}

module.exports = {
  checkState,
  configureImageSnapshotMatcher,
  baseConfigureImageSnapshotMatcher,
  getExampleUrl,
  getRecentState,
  jestTimeout: widgetConfig.snapshotTesting.timeout,
  puppeteerSettings: _.cloneDeep(widgetConfig.snapshotTesting.puppeteer),
  replaceDotsWithSlashes,
  testSnapshots,
  testState,
  waitForWidgetToLoad
}
