const _ = require('lodash')
const atob = require('atob')
const path = require('path')
const chai = require('chai')
const { expect } = chai
const { _extractGroupedTestCases, _generateBddFeatureFileContents } = require('./processTestPlans')
const jsyaml = require('js-yaml')
const sinon = require('sinon')
chai.use(require('sinon-chai'))

// TODO test extractGroupFromPath and extractTestNameFromPath
// TODO this wont work and needs to be ported to jest

describe('extractGroupedTestCases', function () {
  describe('test definition behaviours', function () {
    it('should generate a renderExampleUrl for each test', function () {
      const testDefinition = jsyaml.safeLoad(`
        type: single_widget_single_page
        testname: testname1
        groupname: groupname1
        data: data`)

      const result = _extractGroupedTestCases([testDefinition])

      expect(extractRenderExampleUrlContentFromTest(result[0].tests[0])).to.deep.equal({
        'testname': 'testname1',
        'type': 'single_widget_single_page',
        'widgets': [{ 'config': ['data'] }]
      })
    })

    it('should sort and add groupname', function () {
      const result = _extractGroupedTestCases([
        makeSimplestSingleWidgetSinglePageTestConfig({ testname: 'T1', data: 'D1', groupname: 'a' }),
        makeSimplestSingleWidgetSinglePageTestConfig({ testname: 'T2', data: 'D2', groupname: 'b' }),
        makeSimplestSingleWidgetSinglePageTestConfig({ testname: 'T3', data: 'D3', groupname: 'a' })
      ])

      expect(result.length, '3 tests combine into two groups').to.equal(2)
      expect(_(result).map('groupName').value(), 'correct groupnames').to.deep.equal(['a', 'b'])
      expect(_(result[0].tests).map('testname').value(), 'group a has correct tests').to.deep.equal(['T1', 'T3'])
      expect(_(result[1].tests).map('testname').value(), 'group b has correct tests').to.deep.equal(['T2'])
    })

    describe('parsing and placing commnets', function () {
      it('should correctly place comments in single_page_one_example_per_data files', function () {
        const testDefinition = jsyaml.safeLoad(`
          title: title
          testname: testname
          groupname: a
          width: 400
          height: 200
          rowSize: 2
          type: single_page_one_example_per_data
          comments:
            - location: data2
              text: this test is broken
              status: red
            - location: 0
              text: this test shows some undesirable behaviour
              status: yellow
          data:
            - data1
            - data2
            - data3`)

        const result = _extractGroupedTestCases([testDefinition])
        expect(stripRenderExampleUrlsFrom(result)[0].tests[0].widgets).to.deep.equal([
          { 'config': ['data1'], 'comment': 'this test shows some undesirable behaviour', 'status': 'yellow' },
          { 'config': ['data2'], 'comment': 'this test is broken', 'status': 'red' },
          { 'config': ['data3'] }
        ])
      })

      it('should correctly place comments in for_each_data_in_directory files', function () {
        const testDefinition = jsyaml.safeLoad(`
          testname: testname
          groupname: a
          type: for_each_data_in_directory
          data_directory: "data/dir"
          comments:
            - location: file2
              text: this test is broken
              status: red
            - location: file1
              text: this test shows some undesirable behaviour
              status: yellow`)

        const fs = { readdirSync: sinon.stub().returns(['file1.json', 'file2.json', 'file3.json']) }
        const result = _extractGroupedTestCases([testDefinition], { fs })

        expect(stripRenderExampleUrlsFrom(result)[0].tests).to.deep.equal([
          {
            'testname': 'a data.dir.file1',
            'type': 'for_each_data_in_directory',
            'widgets': [
              {
                'config': ['data.dir.file1'],
                'comment': 'this test shows some undesirable behaviour',
                'status': 'yellow'
              }
            ]
          },
          {
            'testname': 'a data.dir.file2',
            'type': 'for_each_data_in_directory',
            'widgets': [
              {
                'config': ['data.dir.file2'],
                'comment': 'this test is broken',
                'status': 'red'
              }
            ]
          },
          {
            'testname': 'a data.dir.file3',
            'type': 'for_each_data_in_directory',
            'widgets': [
              {
                'config': ['data.dir.file3']
              }
            ]
          }
        ])
      })
    })
  })

  describe('test definition formats', function () {
    it('should handle single_widget_single_page test format', function () {
      const testDefinition = jsyaml.safeLoad(`
        type: single_widget_single_page
        testname: testname
        groupname: a
        width: 600
        height: 400
        data: data`)

      const result = _extractGroupedTestCases([testDefinition])
      expect(stripRenderExampleUrlsFrom(result)).to.deep.equal([
        {
          'tests': [
            {
              'testname': 'testname',
              'type': 'single_widget_single_page',
              'width': 600,
              'height': 400,
              'widgets': [
                {
                  'config': [
                    'data'
                  ]
                }
              ]
            }
          ],
          'groupName': 'a'
        }
      ])
    })

    it('should handle multi_widget_single_page test format', function () {
      const testDefinition = jsyaml.safeLoad(`
        type: multi_widget_single_page
        testname: testname
        groupname: a
        rowSize: 1
        height: 10
        width: 10
        widgets:
          - height: 20
            width: 20
            config: 
              - config1
          - config: 
              - config2_is_array
          - config: config3_is_string`)

      const result = _extractGroupedTestCases([testDefinition])
      expect(stripRenderExampleUrlsFrom(result)).to.deep.equal([
        {
          'tests': [
            {
              'testname': 'testname',
              'type': 'multi_widget_single_page',
              'width': 10,
              'height': 10,
              'rowSize': 1,
              'widgets': [
                { 'height': 20, 'width': 20, 'config': ['config1'] },
                { 'config': ['config2_is_array'] },
                { 'config': ['config3_is_string'] }
              ]
            }
          ],
          'groupName': 'a'
        }
      ])
    })

    it('should handle single_page_one_example_per_config test format', function () {
      const testDefinition = jsyaml.safeLoad(`
        title: title
        testname: testname
        groupname: a
        width: 400
        height: 200
        type: single_page_one_example_per_config
        comments: []
        data: data1
        config:
          - config1
          - config2`)

      const result = _extractGroupedTestCases([testDefinition])
      expect(stripRenderExampleUrlsFrom(result)).to.deep.equal([
        {
          'tests': [
            {
              'testname': 'testname',
              'title': 'title',
              'type': 'single_page_one_example_per_config',
              'width': 400,
              'height': 200,
              'widgets': [
                { 'config': ['data1', 'config1'] },
                { 'config': ['data1', 'config2'] }
              ]
            }
          ],
          'groupName': 'a'
        }
      ])
    })

    it('should handle single_page_one_example_per_data test format', function () {
      const testDefinition = jsyaml.safeLoad(`
        title: title
        testname: testname
        groupname: a
        width: 400
        height: 200
        rowSize: 2
        type: single_page_one_example_per_data
        data:
          - data1
          - data2`)

      const result = _extractGroupedTestCases([testDefinition])
      expect(stripRenderExampleUrlsFrom(result)).to.deep.equal([
        {
          'tests': [
            {
              'testname': 'testname',
              'title': 'title',
              'type': 'single_page_one_example_per_data',
              'width': 400,
              'height': 200,
              'rowSize': 2,
              'widgets': [
                { 'config': ['data1'] },
                { 'config': ['data2'] }
              ]
            }
          ],
          'groupName': 'a'
        }
      ])
    })

    it('should handle for_each_data_in_directory test format', function () {
      const testDefinition = jsyaml.safeLoad(`
        data_directory: "data/dir"
        testname: testname
        groupname: a
        type: for_each_data_in_directory
        use_config_as_title: true`)

      const fs = { readdirSync: sinon.stub().returns(['a.json', 'b.json']) }
      const result = _extractGroupedTestCases([testDefinition], { fs })

      const expectedDirName = path.join('theSrc', 'internal_www', 'data', 'dir')
      expect(fs.readdirSync).to.have.been.calledWith(expectedDirName)

      expect(stripRenderExampleUrlsFrom(result)).to.deep.equal([
        {
          'tests': [
            {
              'testname': 'a data.dir.a',
              'type': 'for_each_data_in_directory',
              'widgets': [
                { 'config': ['data.dir.a'] }
              ],
              'title': 'data.dir.a'
            },
            {
              'testname': 'a data.dir.b',
              'type': 'for_each_data_in_directory',
              'widgets': [
                { 'config': ['data.dir.b'] }
              ],
              'title': 'data.dir.b'
            }
          ],
          'groupName': 'a'
        }
      ])
    })
  })
})

describe('generateBddFeatureFileContents', function () {
  it('generates one scenario per test', function () {
    const contents = _generateBddFeatureFileContents([
      {
        'tests': [
          { 'testname': 'testname-1A', 'renderExampleUrl': 'renderExampleUrl-1A' },
          { 'testname': 'testname-1B', 'renderExampleUrl': 'renderExampleUrl-1B' }
        ],
        'groupName': '1'
      },
      {
        'tests': [
          { 'testname': 'testname-2A', 'renderExampleUrl': 'renderExampleUrl-2A' },
          { 'testname': 'testname-2B', 'renderExampleUrl': 'renderExampleUrl-2B' }
        ],
        'groupName': '2'
      }
    ])

    expect(contents).to.equal(`
    Feature: Take Snapshots in Content Directory
    
      @applitools @autogen,
      Scenario: testname-1A,
        When I take all the snapshots on the page "renderExampleUrl-1A"
      
      @applitools @autogen,
      Scenario: testname-1B,
        When I take all the snapshots on the page "renderExampleUrl-1B"
      
      @applitools @autogen,
      Scenario: testname-2A,
        When I take all the snapshots on the page "renderExampleUrl-2A"
      
      @applitools @autogen,
      Scenario: testname-2B,
        When I take all the snapshots on the page "renderExampleUrl-2B"
      
`)
  })
})

function extractRenderExampleUrlContentFromTest (testDefinition) {
  const [ignore, configString] = testDefinition.renderExampleUrl.split('=') // eslint-disable-line no-unused-vars
  return parseConfigString(configString)
}

function parseConfigString (base64EncodedConfigString) {
  return JSON.parse(atob(base64EncodedConfigString))
}

function makeSimplestSingleWidgetSinglePageTestConfig ({ testname, data, groupname }) {
  return jsyaml.safeLoad(`
    type: single_widget_single_page
    testname: ${testname}
    groupname: ${groupname}
    data: ${data}`
  )
}

function stripRenderExampleUrlsFrom (testPlan) {
  testPlan.forEach(group => {
    group.tests.forEach(test => {
      delete test.renderExampleUrl
    })
  })

  return testPlan
}
