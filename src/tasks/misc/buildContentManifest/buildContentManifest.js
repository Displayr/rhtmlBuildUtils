const _ = require('lodash')
const fs = require('fs')
const path = require('path')
const recursiveReaddirSync = require('recursive-readdir-sync')

const { basePath } = require('../../../lib/widgetConfig')

const getContentFiles = function () {
  const baseContentPath = path.join(basePath, 'theSrc', 'internal_www', 'content')
  const htmlExtensionRegex = new RegExp(/\.html$/)
  const contentTemplateRegex = new RegExp(/content_template\.html$/)

  if (!fs.existsSync(baseContentPath)) { return [] }
  return recursiveReaddirSync(baseContentPath)
    .filter(absolutePath => htmlExtensionRegex.test(absolutePath))
    .filter(absolutePath => !contentTemplateRegex.test(absolutePath))
    // NB +1 to strip leading slash
    .map(absolutePath => absolutePath.substring(baseContentPath.length + 1))
    .sort()
}

const groupContentFiles = function (contentFilePaths, webPrefix = '/content/') {
  const groupedFiles = {}
  _(contentFilePaths).each((contentFilePath) => {
    const parts = contentFilePath.split('/')
    const contentType = (parts.length >= 2)
      ? parts[0]
      : 'misc'

    if (!_.has(groupedFiles, contentType)) {
      groupedFiles[contentType] = []
    }
    groupedFiles[contentType].push(`${webPrefix}${contentFilePath}`)
  })
  return groupedFiles
}

module.exports = function () {
  return groupContentFiles(getContentFiles())
}
