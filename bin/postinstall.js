const shell = require('shelljs')
const appRootDir = require('app-root-dir').get()
const path = require('path')
const fs = require('fs')

updateWebdriver(findProtractor())

function findProtractor () {
  const candidatePaths = [
    path.join(appRootDir, 'node_modules', 'protractor'),
    path.join(appRootDir, 'node_modules', 'rhtmlBuildUtils', 'node_modules', 'protractor')
  ]

  const goodpaths = candidatePaths.filter((candidatePath) => {
    return fs.existsSync(candidatePath)
  })

  if (goodpaths.length < 1) {
    console.log(`postinstall failed, cannot find protractor at any of these paths: ${candidatePaths}`)
    process.exit(1)
  } else {
    return goodpaths[0]
  }
}

function updateWebdriver (protractorPath) {
  // Travis CI was running an older linux build which required chromedriver 2.30 because it was running chrome version < 60.
  // They have recently updgraded so we can just use 2.33 (or even latest chromedriver) but I am leaving this code here just in case
  // TODO March 2018 - delete this commented ternary
  // const chromeDriverVersion = (process.env.CI === true || process.env.CI === 'true') ? '2.33' : '2.33'
  const chromeDriverVersion = '2.43'
  const webdriverScriptPath = path.join(protractorPath, 'bin', 'webdriver-manager')

  process.exit(shell.exec(`node ${webdriverScriptPath} update --no-gecko --versions.chrome ${chromeDriverVersion}`).code)
}
