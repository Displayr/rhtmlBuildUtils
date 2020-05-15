const path = require('path')
const readdir = require('recursive-readdir')

const { basePath } = require('../../../lib/widgetConfig')

const experimentUiAssetDirectory = path.join(__dirname, '../assets/ui')
const experimentUiDestinationDirectory = path.join(basePath, '/browser/experiments/ui')

const compileES6 = require('../../../lib/compileES6')

const getJsFilesToCompileList = () => {
  return readdir(experimentUiAssetDirectory)
    .then(filePaths => filePaths.filter(fileName => fileName.endsWith('.js')))
}

module.exports = function (gulp) {
  return function (done) {
    getJsFilesToCompileList()
      .then(jsFilePaths => {
        const compilePromises = jsFilePaths.map(jsFilePath => {
          return new Promise((resolve, reject) => {
            const destinationDirectory = determineDestinationDirectory({ jsFilePath })

            compileES6({
              gulp,
              entryPointFile: jsFilePath,
              destinationDirectory,
              callback: resolve
            })
          })
        })
        return Promise.all(compilePromises)
      })
      .then(() => done())
  }
}

// input: ${experimentUiAssetDirectory}/cross-experiment.js
// output: ${experimentUiDestinationDirectory}/cross-experiment.js

// input: ${experimentUiAssetDirectory}/snapshot/index.js
// output: ${experimentUiDestinationDirectory}/snapshot/index.js
const determineDestinationDirectory = ({ jsFilePath }) => {
  const variablePartOfFilePath = jsFilePath.substr(experimentUiAssetDirectory.length + 1)
  const directoryPartofVariablePart = path.dirname(variablePartOfFilePath)
  return path.join(experimentUiDestinationDirectory, directoryPartofVariablePart)
}
