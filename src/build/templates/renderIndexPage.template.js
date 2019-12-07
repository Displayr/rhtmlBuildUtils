/* global fetch */
import _ from 'lodash'
import $ from 'jquery'

$(document).ready(function () {
  fetch('/content/contentManifest.json')
    .then(response => { return response.text() })
    .then(JSON.parse)
    .then(contents => {
      _(contents).forIn((contentLinks, listName) => {
        createUnorderedListIfNotExist(listName)
        _(contentLinks).each((contentLink) => {
          const listItem = $('<li>')
          const link = $('<a>')
            .attr('href', contentLink)
            .html(_.last(contentLink.split('/')))

          $(`ul.${listName}`).append(listItem.append(link))
        })
      })
    })

  fetch('/test_plan.json')
    .then(response => { return response.text() })
    .then(JSON.parse)
    .then(testPlanGroups => {
      return _(testPlanGroups).each(renderTestPlanGroup)
    })
    .catch(console.error)
})

const createUnorderedListIfNotExist = (listName) => {
  if ($(`ul.${listName}`).length < 1) {
    $('body').append(`
      <div class="test-plan-group-container">
        <h3 class="test-plan-group-name">${listName}</h3>
        <ul class="test-cases-container ${listName}"/>
      </div>
    `)
  }
}

const renderTestPlanGroup = function (testPlan) {
  const testGroupContainer = $(`
    <div class="test-plan-group-container">
      <h3 class="test-plan-group-name">${testPlan.groupName}</h3>
      <ul class="test-cases-container">
        ${_(testPlan.tests).map((testCase, testIndex) => renderTestCase(testCase, testIndex, testPlan.groupName)).value().join('')}
      </ul>
    </div>
  `)

  $('body').append(testGroupContainer)
}

const renderTestCase = function (testCase, testIndex, groupName) {
  const testNameParts = testCase.testname.split('.')
  const testName = testNameParts[testNameParts.length - 1]
  const testUrl = testCase.renderExampleUrl
  const statuses = _(testCase.widgets)
    .filter(widgetConfig => _.has(widgetConfig, 'status'))
    .map('status')
    .value()

  let status = 'green'
  if (!_.isEmpty(statuses) && statuses.includes('red')) {
    status = 'red'
  } else if (!_.isEmpty(statuses)) {
    status = 'yellow'
  }

  return `
    <li class="test-case status-${status}">
      <a class="load-link" href="${testUrl}" class="test-link">${testName}</a>
    </li>`
}
