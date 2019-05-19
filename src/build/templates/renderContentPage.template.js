// This is a template, that is processed by build/tasks/compileRenderContentPage.js. All the {{X}} and {{{X}}} are replaced.

import $ from 'jquery'
import _ from 'lodash'
/* global window */

const WidgetFactory = require('{{{widget_definition_path}}}')

const defaultConfig = {
  width: {{default_width}},
  height: {{default_height}},
  border: {{default_border}}
}

let exampleCounter = 0

// NB The window.stateUpdates is used by the visualTesting suite to check what stateCallbacks are made
// It assumes there is only one widget on the page
window.stateUpdates = []
const stateChangedCallback = (newState) => {
  window.stateUpdates.push(_.clone(newState))
  if (getUrlVars().echoState) {
    console.log(`stateCallback called with state =${JSON.stringify(newState, {}, 2)}`)
  }
}

const retrieveState = function (configName, stateName) {

  // TODO code is duplicated between renderContentTemplate and state.steps.js
  const expectedStateFileIsDotNotation = stateName.match(/[.]/)
  const replaceDotsWithSlashes = (inputString) => {
    return inputString.replace(/[.]/g, '/')
  }

  const stateUrl = (expectedStateFileIsDotNotation)
    ? `/${replaceDotsWithSlashes(stateName)}.json`
    : `/data/${configName}/${stateName}.json`

  return new Promise((resolve, reject) => {
    $.ajax(stateUrl).done(resolve).fail(reject)
  })
}

const retrieveConfig = function (configString) {

  const retrieveConfigPart = (configPartPath) => {
    return new Promise((resolve, reject) => {
      $.ajax(configPartPath).done(resolve).fail(reject)
    })
  }

  const parseInlineConfigPart = (configPartString) => {
    try {
      return JSON.parse(configPartString)
    } catch (error) {
      return Promise.reject(new Error(`Error JSON.parsing configPart string '${configPartString}'`))
    }
  }

  const getConfigPart = (configPartPath) => {
    if (configPartPath.indexOf('{') === 0) {
      return parseInlineConfigPart(configPartPath)
    } else if (configPartPath.indexOf('.') !== -1) {
      return retrieveConfigPart(`/${configPartPath.replace(new RegExp(/\./, 'g'), '/')}.json`)
    } else {
      return retrieveConfigPart(`/data/${configPartPath}/config.json`)
    }
  }

  const configPartPaths = configString.split('|').map(_.trim)
  const retrievalPromises = configPartPaths.map(getConfigPart)

  return Promise.all(retrievalPromises).then((configParts) => {
    return _.merge(...configParts)
  })
}

const relativeResizersHtmlSnippet = `
<div class="relative-resize-container">
  <button class="relative-resize-button more-button">+25</button>
  <button class="relative-resize-button less-button">-25</button>
  <button class="relative-resize-button more-width-button">+25 W</button>
  <button class="relative-resize-button less-width-button">-25 W</button>
  <button class="relative-resize-button more-height-button">+25 H</button>
  <button class="relative-resize-button less-height-button">-25 H</button>
</div>
`

const rerenderHtmlSnippet = `
<div class="rerender-container">
  <label for="rerender-config">New Config:</label>
  <input type="text" name="rerender-config" id="rerender-config" class="rerender-config rerender-element"/>
  <button class="rerender-button rerender-element">Rerender</button>
</div>
`

const addExampleTo = function () {
  const exampleNumber = `example-${exampleCounter++}`

  const element = $(this)
  element.addClass(exampleNumber)

  const dataAttributes = _.defaults($(this).data(), defaultConfig)

  let configPromise = null
  if (_.has(dataAttributes, 'config')) {
    configPromise = retrieveConfig(dataAttributes.config)
  } else {
    const configString = element.text() || '{}'

    if (configString.indexOf('{') === 0) {
      try {
        configPromise = JSON.parse(configString)
      } catch (err) {
        console.error(`Failed to JSON parse config string: ${configString}`)
        configPromise = Promise.reject(err)
      }
    } else {
      configPromise = configString
    }
  }

  let statePromise = null
  if (_.has(dataAttributes, 'state')) {
    statePromise = retrieveState(dataAttributes.config, dataAttributes.state)
  } else {
    statePromise = Promise.resolve({})
  }

  Promise.all([configPromise, statePromise]).then(([config, userState = {}]) => {
    element.empty()
    let widgetInstance = null

    if (_.has(dataAttributes, 'showConfig')) {
      const configPre = $('<pre>')
        .attr('class', 'config')
        .css('height', 'auto')
        .html(JSON.stringify(config, {}, 2))

      element.append(configPre)
    }

    // NB this will not work with multiple widgets on the page, however the
    // only use case at present is via renderExample.html which always has a single widget on page
    window.resizeHook = function (newWidth, newHeight) {
      console.log(`resize to ${newWidth}x${newHeight}`)

      $(`.${exampleNumber} .widget-container`)
        .css('width', newWidth)
        .css('height', newHeight)

      if ({{includeDimensionsOnWidgetDiv}}) {
        $(`#widget-div-${exampleNumber}`)
          .css('width', newWidth)
          .css('height', newHeight)
      }

      return widgetInstance.resize(newWidth, newHeight)
    }

    if (_.has(dataAttributes, 'resizeControls')) {
      const resizeControls = $(relativeResizersHtmlSnippet)
      element.append(resizeControls)

      const newResizeHandler = function (additionalWidth, additionalHeight) {
        return function (event) {
          event.preventDefault()
          const newWidth = $(`.${exampleNumber} .widget-container`).width() + additionalWidth
          const newHeight = $(`.${exampleNumber} .widget-container`).height() + additionalHeight

          $(`.${exampleNumber} .widget-container`)
            .css('width', newWidth)
            .css('height', newHeight)

          if ({{includeDimensionsOnWidgetDiv}}) {
            $(`#widget-div-${exampleNumber}`)
              .css('width', newWidth)
              .css('height', newHeight)
          }

          return widgetInstance.resize(newWidth, newHeight)
        }
      }

      $(`.${exampleNumber} .more-button`).bind('click', newResizeHandler(25, 25))
      $(`.${exampleNumber} .less-button`).bind('click', newResizeHandler(-25, -25))
      $(`.${exampleNumber} .more-width-button`).bind('click', newResizeHandler(25, 0))
      $(`.${exampleNumber} .less-width-button`).bind('click', newResizeHandler(-25, 0))
      $(`.${exampleNumber} .more-height-button`).bind('click', newResizeHandler(0, 25))
      $(`.${exampleNumber} .less-height-button`).bind('click', newResizeHandler(0, -25))
    }

    if (_.has(dataAttributes, 'rerender')) {
      const rerenderControls = $(rerenderHtmlSnippet)
      element.append(rerenderControls)

      const rerenderHandler = function (event) {
        event.preventDefault()
        const newConfigName = $(`.${exampleNumber} .rerender-config`).val()
        console.log(`newConfig: ${newConfigName}`)

        retrieveConfig(newConfigName).then((newConfig) => {
          widgetInstance.renderValue(newConfig, window.stateUpdates[window.stateUpdates.length - 1] || {})
        }).catch((error) => {
          console.error('Error in rerender:')
          console.error(error)
        })
      }

      $(`.${exampleNumber} .rerender-button`).bind('click', rerenderHandler)
    }

    const surroundingDiv = $('<div>')
      .attr('id', 'widget-container')
      .attr('class', 'widget-container')
      .css('width', `${dataAttributes.width}`)
      .css('height', `${dataAttributes.height}`)

    if (dataAttributes.border) {
      surroundingDiv.addClass('border')
    }

    const widgetDiv = $('<div>')
      .attr('id', `widget-div-${exampleNumber}`)
      .attr('class', 'widget-div')

    if ({{includeDimensionsOnWidgetDiv}}) {
      widgetDiv.css('width', `${dataAttributes.width}`)
      widgetDiv.css('height', `${dataAttributes.height}`)
    }

    surroundingDiv.append(widgetDiv)
    element.append(surroundingDiv)

    const widgetAsHtmlElement = document.getElementById(`widget-div-${exampleNumber}`)
    widgetInstance = WidgetFactory(widgetAsHtmlElement, dataAttributes.width, dataAttributes.height, stateChangedCallback)
    widgetInstance.renderValue(config, userState)
  }).catch((error) => {
    console.error(`Error in widget instantiation with data attributes: ${JSON.stringify(dataAttributes, {}, 2)}`)
    console.log(error)
  })
}

const addLinkToIndex = function () {
  const indexLinkContainer = $('<div>')
    .addClass('index-link')

  const indexLink = $('<a>')
    .attr('href', '/')
    .html('back to index')

  indexLinkContainer.append(indexLink)
  return $('body').prepend(indexLinkContainer)
}

function getUrlVars() {
  var vars = {}
  var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&')
  _(hashes).each(hashString => {
    var hash = hashString.split('=')
    if (!_.has(vars, hash[0])) { vars[hash[0]] = hash[1] }
    else if (_.has(vars, hash[0]) && _.isString(vars[hash[0]])) { vars[hash[0]] = [ vars[hash[0]], hash[1] ]}
    else if (_.has(vars, hash[0]) && _.isArray(vars[hash[0]])) { vars[hash[0]].push(hash[1]) }
  })
  return vars
}

$(document).ready(function () {
  addLinkToIndex()
  $('.example').each(addExampleTo)
  $('body').attr('loaded', '') // TODO rename - it only means the widgets are now running

  // NB "export" addExampleTo function so it can be used in renderExample.html
  window.addExampleTo = addExampleTo

  {{#isReadySelector}}
  setTimeout(() => {
    const readyExpression = '{{{.}}}'
    const widgetCount = $('.example').length
    console.log(`waiting for ${widgetCount} instances of ${readyExpression} then I will set widgets-ready on body`)
    const waitingForReadyInterval = setInterval(() => {
      const readyCount = $(readyExpression).length

      if ((widgetCount) === readyCount) {
        console.log(`setting widgets-ready on body after ${performance.now().toFixed(0)}ms`)
        $('body').attr('widgets-ready', '')
        clearInterval(waitingForReadyInterval)
      }
    }, 250)
  }, 10)
  {{/isReadySelector}}
})
