const Eyes = require('eyes.selenium').Eyes
const _ = require('lodash')
const fs = require('fs-extra')
const path = require('path')
const ConsoleLogHandler = require('eyes.sdk').ConsoleLogHandler
const widgetConfig = require('../../build/lib/widgetConfig')

const requiredConfigKeys = [
  'width',
  'height',
  'defaultMatchTimeout',
  'logLevel'
]

function getKey () {
  let applitoolsKey = null
  const appRootDir = require('app-root-dir').get()
  const keyFile = path.join(appRootDir, '.keys', 'applitools.key')
  try {
    applitoolsKey = fs.readFileSync(keyFile, 'utf-8')
  } catch (err) {
    console.error(`ERROR: Could not read key file: ${keyFile}`)
    process.exit(1)
  }
  return applitoolsKey
}

let eyesGlobal = null

module.exports = {
  getEyes (applitoolsConfig) {
    if (eyesGlobal) { return eyesGlobal }

    _(requiredConfigKeys).each((requiredKey) => {
      if (!_.has(applitoolsConfig, requiredKey)) {
        throw new Error(`required applitoolsConfig field ${requiredKey} not specified`)
      }
    })

    eyesGlobal = new Eyes()
    eyesGlobal.setApiKey(getKey())
    eyesGlobal.setForceFullPageScreenshot(true)
    eyesGlobal.setStitchMode(Eyes.StitchMode.CSS)
    eyesGlobal.setDefaultMatchTimeout(applitoolsConfig.defaultMatchTimeout)
    eyesGlobal.setBatch(widgetConfig.widgetName, Date.now())

    const logLevel = applitoolsConfig.logLevel.toLowerCase()
    const loggingOn = (['info', 'debug'].includes(logLevel))
    const debugLogging = (logLevel === 'debug')

    if (loggingOn) {
      const consoleLogHandler = new ConsoleLogHandler(debugLogging)
      eyesGlobal.setLogHandler(consoleLogHandler)
    }

    return eyesGlobal
  }
}
