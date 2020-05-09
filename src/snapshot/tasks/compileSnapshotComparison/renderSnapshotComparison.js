import _ from 'lodash'
import $ from 'jquery'

$(document).ready(function () {
  const urlVars = getUrlVars()
  const experimentName = urlVars['experimentName']
  const snapshotName = urlVars['snapshotName']
  const note = decodeURIComponent(urlVars['note'])
  const status = urlVars['status']
  const dimension1 = (urlVars['dimension1']) ? urlVars['dimension1'].split(',') : []
  const dimension2 = (urlVars['dimension2']) ? urlVars['dimension2'].split(',') : []
  const hasBaseline = (urlVars['hasBaseline'] === 'true')

  $('a.back').attr('href', `/experiments/ui/experiment.html?experimentName=${experimentName}`)
  $('body').append($(`<h1>Experiment: ${experimentName}</h1>`))
  $('body').append($(`<h1>Snapshot: ${snapshotName}</h1>`))
  $('body').append($(`<h2>Status: <span class="status-${status}">${status}</span></h2>`))
  $('body').append($(`<h2>Note: ${note}</h2>`))


  console.log(`hasBaseline:`, hasBaseline)
  if (hasBaseline) {
    $('body').append(makeBaselineRow({ experimentName, snapshotName }))
  }

  if (dimension2.length > 0) {
    _(dimension1).each(row => {
      $('body').append(makeHeaderRow({ columns: dimension2 }))
      $('body').append(makeRow({ experimentName, snapshotName, row, columns: dimension2 }))
    })
  } else if (dimension1.length > 0) {
    $('body').append(makeHeaderRow({ columns: dimension1 }))
    $('body').append(makeRow({ experimentName, snapshotName, columns: dimension1 }))
  } else {
    console.error(`cannot render without at least one dimension. Pass a comma seperated array of values as queryParam dimension1 or dimension2`)
  }

  if (urlVars['dimension3']) {
    console.error(`currently dont support rendering experiments with 3 dimensions`)
  }

})

// TODO extract into utils
const getUrlVars = () => {
  var vars = {}
  var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&')
  _(hashes).each(hashString => {
    var hash = hashString.split('=')
    if (!_.has(vars, hash[0])) { vars[hash[0]] = hash[1] } else if (_.has(vars, hash[0]) && _.isString(vars[hash[0]])) { vars[hash[0]] = [ vars[hash[0]], hash[1] ] } else if (_.has(vars, hash[0]) && _.isArray(vars[hash[0]])) { vars[hash[0]].push(hash[1]) }
  })
  return vars
}

const makeBaselineRow = ({ experimentName, snapshotName }) => {
  const baselineRowElement = $('<div>')
  baselineRowElement.append($('<div class="row-header">baseline</div>'))
  baselineRowElement.append($(`<img 
    class="experiment-image" 
    src="/experiments/${experimentName}/results/baseline/${snapshotName}-snap.png"/>`
  ))
  return baselineRowElement
}

const makeHeaderRow = ({ columns }) => {
  const headerRowElement = $('<div class="row">')
  const rowHeaderElement = $(`<div class="row-header"></div>`)
  headerRowElement.append(rowHeaderElement)
  _(columns).each(column => {
    const headerColumnElement = $(`<div class="column-header">${column}</div>`)
    headerRowElement.append(headerColumnElement)
  })
  return headerRowElement
}

const makeRow = ({ experimentName, snapshotName, row = null, columns }) => {
  const rowElement = $('<div class="row">')
  const rowHeader = $(`<div class="row-header">${(row) ? row : ''}</div>`)
  rowElement.append(rowHeader)
  _(columns).each(column => {
    const resultSetName = (row) ? `${row}-${column}` : column
    const imageElement = $(`<img class="experiment-image" src="/experiments/${experimentName}/results/${resultSetName}/${snapshotName}-snap.png"/>`)
    rowElement.append(imageElement)
  })
  return rowElement
}
