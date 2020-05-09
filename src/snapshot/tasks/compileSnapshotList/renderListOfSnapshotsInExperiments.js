/* global fetch */
import _ from 'lodash'
import $ from 'jquery'
import jsyaml from 'js-yaml'

const EXPERIMENT_CONFIG_FILENAME = 'experimentConfig.json'
const EXPERIMENT_TESTPLAN_FILENAME = 'testplan.yaml'

$(document).ready(function () {
  const urlVars = getUrlVars()
  const experimentName = urlVars['experimentName']

  Promise.all([getSnapshotList(experimentName), getExperimentDefinition(experimentName), getExperimentNotes(experimentName)])
    .then(([snapshotList, experimentDefinition, notesHtml]) => {
      const { dimensions, baseline } = experimentDefinition
      const hasBaseline = _.has(experimentDefinition, 'baseline')
      renderPage({ experimentName, snapshotList, dimensions, hasBaseline, notesHtml })
    })
})

const getSnapshotList = (experimentName) => fetch(`/experiments/${experimentName}/${EXPERIMENT_TESTPLAN_FILENAME}`)
  .then(response => response.text())
  .then(jsyaml.safeLoad)
  .then(extractSnapshotNamesFromTestPlan)

const getExperimentDefinition = (experimentName) => fetch(`/experiments/${experimentName}/${EXPERIMENT_CONFIG_FILENAME}`)
  .then(response => response.text())
  .then(JSON.parse)

const getExperimentNotes = (experimentName) => fetch(`/experiments/${experimentName}/notes.html`)
  .then(response => response.text())

const extractSnapshotNamesFromTestPlan = (testPlan) => {
  return _(testPlan.configs)
    .map(({ config: configString, note, status }) => {
      const lastConfigPart = _.last(configString.split('|'))
      const lastNamePart = _.last(lastConfigPart.split('.'))
      return { name: lastNamePart, note, status }
    })
    .value()
}

const getUrlVars = () => {
  var vars = {}
  var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&')
  _(hashes).each(hashString => {
    var hash = hashString.split('=')
    if (!_.has(vars, hash[0])) { vars[hash[0]] = hash[1] } else if (_.has(vars, hash[0]) && _.isString(vars[hash[0]])) { vars[hash[0]] = [ vars[hash[0]], hash[1] ] } else if (_.has(vars, hash[0]) && _.isArray(vars[hash[0]])) { vars[hash[0]].push(hash[1]) }
  })
  return vars
}

// NB reusing style definitions from index.css
const renderPage = ({ experimentName, snapshotList, dimensions, hasBaseline, notesHtml }) => {
  const preAmble = $(`
    <h1>Experiment: ${experimentName}</h1>
    ${notesHtml}
  `)

  const testGroupContainer = $(`
    <div class="test-plan-group-container">
      <h3 class="test-plan-group-name">Snapshots</h3>
      <ul class="test-cases-container">
      </ul>
    </div>
  `)

  $('body').append(preAmble)
  $('body').append(testGroupContainer)

  const dimensionQueryParams = (dimensions.length == 2)
    ? `dimension1=${dimensions[0].join(',')}&dimension2=${dimensions[1].join(',')}`
    : `dimension1=${dimensions[0].join(',')}`

  _(snapshotList).each(({ name, note = '', status = 'none' }) => {
    const snapshotComparisonUrl = `/experiments/ui/snapshot/?experimentName=${experimentName}&snapshotName=${name}&note=${note}&status=${status}&hasBaseline=${hasBaseline}&${dimensionQueryParams}`
    const listItem = $(`
      <li class="test-case status-${status}">
        <a class="load-link status-${status}" title="${note}" href="${snapshotComparisonUrl}" class="test-link">${name}</a>
      </li>
    `)

    $('ul.test-cases-container').append(listItem)
  })
}
