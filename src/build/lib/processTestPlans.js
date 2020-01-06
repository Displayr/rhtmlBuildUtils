const _ = require('lodash')
const fs = require('fs')
const path = require('path')
const bluebird = require('bluebird')
const promisifiedFS = bluebird.promisifyAll(require('fs-extra'))
const jsyaml = require('js-yaml')
const readdir = require('recursive-readdir')

// TODO highly opinionated. Assumes gulp is run from the root of the target project !
const projectRoot = path.join('.')
const browserDir = path.join(projectRoot, 'browser')
const tmpDir = path.join(projectRoot, '.tmp')
const testPlanDestinations = [
  path.join(browserDir, 'test_plan.json'),
  path.join(tmpDir, 'test_plan.json')
]
const bddDestination = path.join(tmpDir, 'testplan.feature')
const renderExampleBasePath = '/renderExample.html'

// Big Workers first
// ---------

function processTestPlans (testPlansDir) {
  if (fs.existsSync(testPlansDir)) {
    return _loadConfigs(testPlansDir)
      .then(_extractGroupedTestCases)
      .then(_generateBddFeatureFile)
      .then(_generateBrowserJsonFile)
  } else {
    console.log(`no test plan dir at '${testPlansDir}. Skipping step`)
    return Promise.resolve()
  }
}

function _loadConfigs (testPlansDir, { fs = promisifiedFS } = {}) {
  return readdir(testPlansDir)
    .then(filePaths => filePaths.filter(fileName => fileName.endsWith('.yaml')))
    .then(testPlanFilePaths => Promise.all(testPlanFilePaths.map(testPlanFilePath =>
      fs.readFileAsync(testPlanFilePath, 'utf8')
        .then(jsyaml.safeLoad)
        .then(fileContents => _.defaults(fileContents, {
          filePath: testPlanFilePath, // NB just for error logging
          testname: _extractTestNameFromPath(testPlanFilePath),
          groupname: _extractGroupFromPath(testPlansDir, testPlanFilePath)
        }))
    ))
    )
}

function _extractGroupedTestCases (testPlanFiles, { fs = promisifiedFS } = {}) {
  return _(testPlanFiles)
    .groupBy('groupname')
    .map((testDefinitions, groupname) => {
      try {
        return {
          tests: _(testDefinitions)
            .map(testDefinition => _configToTestCases(testDefinition, { fs }))
            .flatten()
            .value(),
          groupName: groupname
        }
      } catch (error) {
        error.message = `error converting group '${groupname}' files ${_(testDefinitions).map('filePath')} contents ${JSON.stringify(testDefinitions, {}, 2)} : ${error}`
        throw error
      }
    })
    .value()
}

function _configToTestCases (testDefinition, { fs = promisifiedFS } = {}) {
  const commonRenderExampleParts = _extractCommonParamsFromTestDefinition(testDefinition)
  const arrayOfwidgetConfigsAndOverrides = _extractWidgetConfigsAndOverrides(testDefinition, { fs })

  return arrayOfwidgetConfigsAndOverrides.map((widgetConfig, outerWidgetIndex) => {
    const renderExampleConfigWithoutUrl = _.assign({}, commonRenderExampleParts, widgetConfig)
    if (!_.has(renderExampleConfigWithoutUrl, 'testname')) { throw new Error('missing testname') }

    const positionalComments = _(renderExampleConfigWithoutUrl.comments || [])
      .transform((result, { location, text, status = 'red' }) => {
        const isNumberRegex = new RegExp('^[0-9]+$')
        const locationIsIndex = isNumberRegex.test(`${location}`)

        if (locationIsIndex) {
          result[`index-${location}`] = { text, status }
        } else {
          result[location] = { text, status }
        }
        return result
      }, {})
      .value()

    _(renderExampleConfigWithoutUrl.widgets).each((widgetConfig, index) => {
      // this deals with for each config or for each data but only generate one snapshot (ie one renderExample configs)
      if (_.has(positionalComments, `index-${index}`)) {
        widgetConfig.comment = positionalComments[`index-${index}`].text
        widgetConfig.status = positionalComments[`index-${index}`].status
      }

      // this deals with directory scanning configs that have more than one snapshot (ie multiple renderExample configs)
      if (arrayOfwidgetConfigsAndOverrides.length > 1 && _.has(positionalComments, `index-${outerWidgetIndex}`)) {
        widgetConfig.comment = positionalComments[`index-${outerWidgetIndex}`].text
        widgetConfig.status = positionalComments[`index-${outerWidgetIndex}`].status
      }

      const widgetConfigStrings = widgetConfig.config.join('|')
      const matchingComment = _.find(_.keys(positionalComments), (commentLocation) => {
        return widgetConfigStrings.indexOf(commentLocation) !== -1
      })
      if (matchingComment) {
        widgetConfig.comment = positionalComments[matchingComment].text
        widgetConfig.status = positionalComments[matchingComment].status
      }
    })
    delete renderExampleConfigWithoutUrl.comments

    const renderExampleUrl = _generateRenderExampleUrl(renderExampleConfigWithoutUrl)
    return _.assign({}, renderExampleConfigWithoutUrl, { renderExampleUrl })
  })
}

function _extractWidgetConfigsAndOverrides (testDefinition, { fs = promisifiedFS } = {}) {
  const parsers = {
    single_widget_single_page: function (testDefinition) {
      // NB return an array of one because this generates a single test case
      // NB gather all data and config, put together into a single widget
      const datas = _toArray(testDefinition.data)
      const configs = _toArray(testDefinition.config)
      return [
        {
          widgets: [{ config: datas.concat(configs) }]
        }
      ]
    },
    multi_widget_multi_page: function (testDefinition) {
      const configs = _toArray(testDefinition.configs)
      return configs.map(configObjectOrString => {
        const config = (_.isString(configObjectOrString)) ? { config: configObjectOrString } : configObjectOrString
        return {
          widgets: [config],
          testname: _.last(config.config.split('.'))
        }
      })
    },
    multi_widget_single_page: function (testDefinition) {
      // NB return an array of one because this generates a single test case
      return [
        {
          widgets: _toArray(testDefinition.widgets)
        }
      ]
    },
    single_page_one_example_per_config: function (testDefinition) {
      // NB return an array of one because this generates a single test case
      return [
        {
          widgets: _toArray(testDefinition.config).map(configPath => {
            return { config: (_.has(testDefinition, 'data')) ? [testDefinition.data, configPath] : [configPath] }
          })
        }
      ]
    },
    single_page_one_example_per_data: function (testDefinition) {
      // NB return an array of one because this generates a single test case
      return [
        {
          widgets: _getDataStringsFromTestDefinition(testDefinition, { fs }).map((dataString) => {
            return { config: (_.has(testDefinition, 'config')) ? [testDefinition.config, dataString] : [dataString] }
          })
        }
      ]
    },
    for_each_data_in_directory: function (testDefinition) {
      // TODO disallow positionalComments that use a numeric index, the test def should use file names to reference tests

      // NB return an array of N because this generates a test case per data file
      const { groupname } = testDefinition
      const dataStrings = _getDataStringsFromTestDefinition(testDefinition, { fs })
      const configStrings = _toArray(testDefinition.config) || []
      return dataStrings
        .map(dataString => {
          return {
            testname: `${groupname} ${dataString}`,
            widgets: [{ config: [dataString].concat(configStrings) }]
          }
        })
        .map(config => {
          if (testDefinition.use_config_as_title) {
            config.title = config.widgets[0].config.join('|')
          }
          return config
        })
    }
  }

  if (!_.has(parsers, testDefinition.type)) {
    throw new Error(`invalid type ${testDefinition.type}. Valid types: ${_.keys(parsers).join(',')}`)
  }

  return _stripEmptyConfigParts(parsers[testDefinition.type](testDefinition))
}

// TODO can clean this up
function _extractCommonParamsFromTestDefinition (testDefinition) {
  const renderExampleConfig = {}

  if (_.has(testDefinition, 'testname')) {
    renderExampleConfig.testname = testDefinition.testname
  }

  if (_.has(testDefinition, 'general_comments')) {
    renderExampleConfig.general_comments = _toArray(testDefinition.general_comments)
  }

  if (_.has(testDefinition, 'comments')) {
    renderExampleConfig.comments = _toArray(testDefinition.comments)
  }

  if (_.has(testDefinition, 'title')) { renderExampleConfig.title = testDefinition.title }

  if (_.has(testDefinition, 'type')) {
    renderExampleConfig.type = testDefinition.type
  } else {
    throw new Error('missing type')
  }

  if (_.has(testDefinition, 'width')) {
    renderExampleConfig.width = parseInt(testDefinition.width)
    if (_.isNaN(renderExampleConfig.width)) {
      throw new Error(`invalid width: ${testDefinition.width}`)
    }
  }
  if (_.has(testDefinition, 'height')) {
    renderExampleConfig.height = parseInt(testDefinition.height)
    if (_.isNaN(renderExampleConfig.height)) {
      throw new Error(`invalid height: ${testDefinition.height}`)
    }
  }

  if (_.has(testDefinition, 'rowSize')) {
    renderExampleConfig.rowSize = parseInt(testDefinition.rowSize)
    if (_.isNaN(renderExampleConfig.rowSize)) {
      throw new Error(`invalid rowSize: ${testDefinition.rowSize}`)
    }
  }
  return renderExampleConfig
}

function _generateBddFeatureFile (combinedTestPlan, { fs = promisifiedFS } = {}) {
  const featureFileContents = _generateBddFeatureFileContents(combinedTestPlan)

  return fs.mkdirpAsync(tmpDir)
    .then(() => {
      console.log(`creating ${bddDestination}`)
      return fs.writeFileAsync(bddDestination, featureFileContents, 'utf-8')
    })
    .then(() => combinedTestPlan)
}

function _generateBddFeatureFileContents (combinedTestPlan) {
  const tests = _(combinedTestPlan)
    .map('tests')
    .flatten()
    .value()

  let featureFileContents = `
    Feature: Take Snapshots in Content Directory
    `

  const scenarioStrings = tests.map(({ testname, renderExampleUrl }) => {
    return `
      @applitools @autogen,
      Scenario: ${testname},
        When I take all the snapshots on the page "${renderExampleUrl}"
      `
  })

  featureFileContents += scenarioStrings.join('')
  featureFileContents += '\n'
  return featureFileContents
}

function _generateBrowserJsonFile (combinedTestPlan, { fs = promisifiedFS } = {}) {
  return fs.mkdirpAsync(browserDir)
    .then(() => {
      _(testPlanDestinations).each(testPlanDestination => {
        console.log(`creating ${testPlanDestination}`)
        return fs.writeFileAsync(testPlanDestination, JSON.stringify(combinedTestPlan, {}, 2))
      })
    })
    .then(() => combinedTestPlan)
}

// Utilities
// ---------

// Given baseDir of /foo/bar
// '/foo/bar/anonymised_samples.yaml' => anonymised_samples
// '/foo/bar/functional_tests/color_variations.yaml' => functional_tests
function _extractGroupFromPath (baseDir, absolutePath) {
  const relativePath = absolutePath.substring(baseDir.length + 1).replace('.yaml', '')
  const relativePathParts = relativePath.split('/')
  return relativePathParts[0]
}

function _extractTestNameFromPath (testFilePath) {
  const fileName = _.last(testFilePath.split('/'))
  return fileName.replace(/.(yaml|json)/, '')
}

function _generateRenderExampleUrl (renderExampleConfig) {
  const configString = new Buffer(JSON.stringify(renderExampleConfig)).toString('base64') // eslint-disable-line node/no-deprecated-api
  return `${renderExampleBasePath}?config=${configString}`
}

// const exampleConfig = {
//   width: 0,
//   height: 0,
//   testname: '',
//   general_comments: [],
//   comments: [
//     { location: 18, text: "the flux capacitor is broken, this example shows it" }
//   ],
//   widgets: [],
//   widget: {
//     config: [''],
//     comment: '',
//     status: 'red'
//   }
// }

function _stripEmptyConfigParts (testDefinition) {
  return testDefinition.map(testDefinitionLevel1 => {
    testDefinitionLevel1.widgets = testDefinitionLevel1.widgets.map(widgetDefinition => {
      widgetDefinition.config = (_.isArray(widgetDefinition.config) ? widgetDefinition.config : [widgetDefinition.config])
        .filter(configPart => configPart.length > 0)
      return widgetDefinition
    })
    return testDefinitionLevel1
  })
}

function _toArray (stringOrArray) {
  if (_.isNull(stringOrArray)) { return [] }
  if (_.isUndefined(stringOrArray)) { return [] }
  if (_.isArray(stringOrArray)) { return stringOrArray }
  return [stringOrArray]
}

function _getDataStringsFromTestDefinition (testDefinition, { fs = promisifiedFS } = {}) {
  if (_.has(testDefinition, 'data_directory')) {
    const directoryPath = path.join(projectRoot, 'theSrc', 'internal_www', testDefinition.data_directory)
    const allSlashesRegExp = new RegExp('/', 'g')
    return fs.readdirSync(directoryPath)
      .filter(fileName => fileName.match(/.json$/))
      .map(fileName => `${testDefinition.data_directory.replace(allSlashesRegExp, '.')}.${_extractTestNameFromPath(fileName)}`)
  } else if (_.has(testDefinition, 'data')) {
    return _toArray(testDefinition.data)
  } else {
    throw new Error(`cannot extract data strings, test definition must contain 'data' or 'data_directory' : ${JSON.stringify(testDefinition)}`)
  }
}

module.exports = {
  processTestPlans,
  _extractGroupedTestCases, // NB exported test only
  _generateBddFeatureFileContents // NB exported test only
}
