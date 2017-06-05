const appRootDir = require('app-root-dir').get()
const path = require('path')
const _ = require('lodash')

const widgetConfig = require(path.join(appRootDir, 'build', 'config', 'widget.config'))
const defaultWidgetConfig = require('../lib/widgetConfig')

module.exports = _.defaults({ basePath: appRootDir }, widgetConfig, defaultWidgetConfig)
