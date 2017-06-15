const appRootDir = require('app-root-dir').get()
const path = require('path')
const _ = require('lodash')

const widgetConfig = require(path.join(appRootDir, 'build', 'config', 'widget.config'))
const defaultWidgetConfig = require('../config/default.widget.config')

module.exports = _.defaultsDeep({ basePath: appRootDir }, widgetConfig, defaultWidgetConfig)
