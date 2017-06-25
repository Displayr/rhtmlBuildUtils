/*
 * This file generates .tmp/snapshots.feature.
 * The snapshots.feature file tells protractor to take snapshots of all the html files in
 *  the content area that have at least one snapshot defined.
 */

const shell = require('shelljs')
const path = require('path')
const bluebird = require('bluebird')
const fs = bluebird.promisifyAll(require('fs-extra'))

const widgetConfig = require('../lib/widgetConfig')

module.exports = function (gulp) {
  return function () {
    const contentPath = path.join(widgetConfig.basePath, 'theSrc', 'internal_www', 'content')
    const tmpDir = path.join(widgetConfig.basePath, '.tmp')
    const contentFilesWithSnapshots = shell.grep('-l', 'snapshot-name=', `${contentPath}/**/*.html`)
      .split('\n')
      .filter(candidatePath => candidatePath.length > 0)
      .filter(candidatePath => !candidatePath.match(/content_template.html/))

    let featureFileContents = `
  Feature: Take Snapshots in Content Directory
  `

    const scenarioStrings = contentFilesWithSnapshots.map((contentFileAbsolutePath) => {
      const scenarioUrl = contentFileAbsolutePath.substr(contentFileAbsolutePath.indexOf('internal_www') + 'internal_www'.length)
      const [, shortenedName] = contentFileAbsolutePath.match('/([^/]+$)')
      return [
        '',
        '',
        '  @applitools @autogen',
        `  Scenario: ${shortenedName}`,
        `    When I take all the snapshots on the page "${scenarioUrl}"`
      ].join('\n')
    })

    featureFileContents += scenarioStrings.join('')
    featureFileContents += '\n'

    return fs.mkdirpAsync(tmpDir)
      .then(() => {
        const filePath = path.join(tmpDir, 'snapshots.feature')
        console.log(`creating ${filePath}`)
        fs.writeFileAsync(filePath, featureFileContents, 'utf-8')
      })
  }
}
