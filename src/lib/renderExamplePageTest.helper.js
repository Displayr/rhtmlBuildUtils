const _ = require('lodash')
const fs = require('fs-extra')
const deepDiff = require('deep-diff')
const { mkdirp } = require('fs-extra')
const path = require('path')
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
  const configString = Buffer.from(JSON.stringify(config)).toString('base64')
  return `http://localhost:9000/renderExample.html?config=${configString}`
}

const waitForWidgetToLoad = async ({ page }) => page.waitForFunction(selectorString => {
  return document.querySelectorAll(selectorString).length
}, { timeout: widgetConfig.snapshotTesting.timeout }, 'body[widgets-ready], .rhtml-error-container')

// NB puppeteer removed page.waitFor(milliseconds) in v14 and its replacement page.waitForTimeout in
// v22, with no successor. Callers that need a plain delay use this instead.
const sleep = (milliseconds) => new Promise(resolve => setTimeout(resolve, milliseconds))

const testState = async ({ page, stateName, tolerance }) => {
  let stateIsGood = await checkState({ page, expectedStateFile: stateName, tolerance })
  expect(stateIsGood).toEqual(true)
}

// NB this replaced request-promise, which is deprecated along with the request package it extends.
// The status check is deliberate: request-promise rejected on a non-2xx response, whereas fetch
// resolves regardless and only reports the status on the response. Without it, a missing state file
// would reach .json() as a 404 body and fail with a JSON parse error naming neither the url nor the
// status.
//
// NB the disable below is about a stability LABEL, not availability. Global fetch has been present and
// enabled by default since node 18; node only dropped the "experimental" tag in 21. engines.node
// admits ^20.19.0 because that is eslint 10's floor, so eslint-plugin-n reports it. Narrowing engines
// to >=22 purely to silence this would drop node 20 for every widget developer, which is a worse
// trade than one scoped directive.
const fetchJson = async (url) => {
  // eslint-disable-next-line n/no-unsupported-features/node-builtins
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`GET ${url} failed with status ${response.status} ${response.statusText}`)
  }
  return response.json()
}

const checkState = async ({ page, expectedStateFile, tolerance: toleranceString }) => {
  return new Promise((resolve, reject) => {
    const expectedStateUrl = `http://localhost:9000/${replaceDotsWithSlashes(expectedStateFile)}.json`

    const { statePreprocessor } = widgetConfig.internalWebSettings
    const expectedStatePromise = fetchJson(expectedStateUrl)
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
  await sleep(widgetConfig.snapshotTesting.snapshotDelay)
  let widgets = await page.$$(widgetConfig.internalWebSettings.singleWidgetSnapshotSelector)
  console.log(`taking ${widgets.length} snapshot(s) for ${testName}`)

  const filesystemSafe = input => input
    .replace(/ /g, '_')
    .replace(/\./g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .toLowerCase()

  const getSnapshotName = (index) => {
    if (widgets.length === 1) { return filesystemSafe(testName) }
    const snapshotName = _.get(snapshotNames, `[${index}]`, `${index + 1}`)
    return `${filesystemSafe(testName)}-${filesystemSafe(snapshotName)}`
  }

  async function asyncForEach (array, callback) {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array)
    }
  }

  // NB failures are COLLECTED here and rethrown once at the end, rather than swallowed or thrown
  // immediately. Two separate reasons:
  //
  //  * Swallowing them (what this did before) meant a test whose images did not match reported PASS.
  //    The job only went red via jest's aggregate snapshotState.unmatched count, so reading the
  //    per-test list led straight to the wrong conclusion about what had actually failed.
  //  * Throwing from inside the loop would abort it, so a multi-widget test would lose the diagnostic
  //    new_snapshots image for every widget after the first failure.
  //
  // Collecting keeps the full set of diagnostics while still failing the test that failed.
  const failures = []

  await asyncForEach(widgets, async (widget, index) => {
    // NB puppeteer now declares screenshot() as resolving a Uint8Array. It still hands back a
    // Buffer in practice, but jest-image-snapshot passes this straight to pngjs, which calls
    // Buffer-only methods on it, so do not depend on the undeclared part of that contract.
    const rawImage = await widget.screenshot({})
    let image = Buffer.isBuffer(rawImage) ? rawImage : Buffer.from(rawImage)
    const snapshotName = getSnapshotName(index)
    try {
      expect(image).toMatchImageSnapshot({ customSnapshotIdentifier: snapshotName })
    } catch (e) {
      failures.push({ snapshotName, error: e })

      // Can't find group name so just put all new snapshots in same folder
      const snapshotDirectory = path.join(
        widgetConfig.basePath,
        widgetConfig.snapshotTesting.snapshotDirectory,
        widgetConfig.snapshotTesting.env,
        widgetConfig.snapshotTesting.branch
      )
      const newSnapshotDir = path.join(snapshotDirectory, 'new_snapshots')
      // NB synchronous: the previous fs.writeFile callback form was fire-and-forget, so the process
      // could exit before the diagnostic image reached disk.
      fs.mkdirpSync(newSnapshotDir)
      fs.writeFileSync(path.join(newSnapshotDir, `${snapshotName}-snap.png`), image, 'binary')
    }
  })

  if (failures.length) {
    const names = failures.map(({ snapshotName }) => snapshotName).join(', ')
    const detail = failures.map(({ error }) => error.message).join('\n\n')
    throw new Error(`${failures.length} snapshot(s) did not match: ${names}\n\n${detail}`)
  }
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
  sleep,
  testSnapshots,
  testState,
  waitForWidgetToLoad
}
