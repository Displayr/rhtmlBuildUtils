import _ from 'lodash'
import $ from 'jquery'
import jsyaml from 'js-yaml'

const getExperimentList = () => fetch('/content/experimentManifest.json')
  .then(response => response.text())
  .then(JSON.parse)

const getCrossExperimentList = () => fetch('/content/crossExperimentSnapshotComparisons.yaml')
  .then(response => response.text())
  .then(jsyaml.safeLoad)
  .then(x => x['crossExperimentSnapshotComparisons'])
  .catch(err => {
    console.log('could not fetch /content/crossExperimentSnapshotComparisons.yaml. Skipping')
    return []
  })


$(document).ready(function () {
  Promise.all([getExperimentList(), getCrossExperimentList()])
    .then(([experimentNames, crossExperimentList]) => {
      renderExperimentList(experimentNames),
      renderCrossExperimentList(crossExperimentList)
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

// NB reusing style definitions from index.css
const renderCrossExperimentList = (crossExperimentList) => {
  const testGroupContainer = $(`
    <div class="test-plan-group-container">
      <h3 class="test-plan-group-name">Cross Experiment Snapshot Lists</h3>
      <ul class="cross-experiment-list">
      </ul>
    </div>
  `)

  $('body').append(testGroupContainer)

  // <a class="back" href="/experiments/ui/cross-experiment.html?experimentA=varyFontSize&configA=wee&experimentB=varyFontColor&configB=blue">template cross</a>

  _(crossExperimentList).each(({ name, experimentA, experimentB, configA, configB }) => {
    const url = `/experiments/ui/cross-experiment.html?experimentA=${experimentA}&configA=${configA}&experimentB=${experimentB}&configB=${configB}`
    const listItem = $(`
      <li class="test-case">
        <a class="load-link" href="${url}" class="test-link">${name}</a>
      </li>
    `)

    $('ul.cross-experiment-list').append(listItem)
  })
}
