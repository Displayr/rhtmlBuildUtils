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
  const webdriverScriptPath = path.join(protractorPath, 'bin', 'webdriver-manager')
  process.exit(shell.exec(`node ${webdriverScriptPath} update --no-gecko`).code)
}
