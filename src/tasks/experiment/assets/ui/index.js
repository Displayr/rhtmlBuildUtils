import _ from 'lodash'
import $ from 'jquery'
/* global fetch */

const getExperimentList = () => fetch('/content/experimentManifest.json')
  .then(response => response.text())
  .then(JSON.parse)

$(document).ready(function () {
  getExperimentList()
    .then(experimentNames => {
      renderExperimentList(experimentNames)
    })
})

// NB reusing style definitions from index.css
const renderExperimentList = (experimentNames) => {
  const testGroupContainer = $(`
    <div class="test-plan-group-container">
      <h3 class="test-plan-group-name">Experiments</h3>
      <ul class="experiment-list">
      </ul>
    </div>
  `)

  $('body').append(testGroupContainer)

  _(experimentNames).each(experimentName => {
    const experimentUrl = `/experiments/ui/experiment.html?experimentName=${experimentName}`
    const listItem = $(`
      <li class="test-case">
        <a class="load-link" href="${experimentUrl}" class="test-link">${experimentName}</a>
      </li>
    `)

    $('ul.experiment-list').append(listItem)
  })
}
