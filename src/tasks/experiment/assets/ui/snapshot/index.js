import _ from 'lodash'
import $ from 'jquery'

$(document).ready(function () {
  const urlVars = getUrlVars()
  const experimentName = urlVars['experimentName']
  const snapshotName = urlVars['snapshotName']
  const note = decodeURIComponent(urlVars['note'])
  const status = urlVars['status']
  const rows = _.keys(urlVars)
    .filter(urlParam => urlParam.match(/^row/)) // tighten regex with a \c+$
    .map(urlParam => urlVars[urlParam].split(','))
    .sort()
  const maxRowSize = _(rows)
    .map(rowEntries => rowEntries.length)
    .max()

  // 15 - hard coded arbitrary "take back a few px for safety"
  const maxImageWidth = (window.innerWidth - 15) / maxRowSize

  $('a.back').attr('href', `/experiments/ui/experiment.html?experimentName=${experimentName}`)
  $('body').append($(`<h1>Experiment: ${experimentName}</h1>`))
  $('body').append($(`<h1>Snapshot: ${snapshotName}</h1>`))
  $('body').append($(`<h2>Status: <span class="status-${status}">${status}</span></h2>`))
  $('body').append($(`<h2>Note: ${note}</h2>`))

  _(rows)
    .each(row => {
      $('body').append(makeRow({ experimentName, snapshotName, row, maxImageWidth }))
    })
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

const makeRow = ({ experimentName, snapshotName, row, maxImageWidth }) => {
  const rowElement = $('<div class="row">')
  _(row).each(iterationName => {
    const cellElement = $(`<div class="snapshot-cell">`)
    const titleElement = $(`<div class="snapshot-cell-title">${iterationName}</div>`)
    const imageElement = $(`<img style="max-width:${maxImageWidth}px" class="snapshot-cell-image" src="/experiments/${experimentName}/results/${iterationName}/${snapshotName}-snap.png"/>`)
    cellElement.append(titleElement)
    cellElement.append(imageElement)
    rowElement.append(cellElement)
  })
  return rowElement
}
