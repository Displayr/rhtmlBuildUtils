const path = require('path')

// NB processTestPlans pulls in widgetConfig, which requires a build/config/widget.config from the
// consuming widget project. That file does not exist in this repo, so stub it out. basePath is
// asserted against below, so it has to be a value path.join will not mangle.
const fakeBasePath = path.join(path.sep === '/' ? '/fake' : 'C:\\fake', 'project')
jest.mock('../widgetConfig', () => ({ basePath: require('path').join(require('path').sep === '/' ? '/fake' : 'C:\\fake', 'project') }))

const { _extractGroupedTestCases } = require('./index')

// NB test definitions are plain objects rather than yaml. processTestPlans parses the yaml itself in
// _loadConfigs and hands _extractGroupedTestCases the parsed objects, so yaml here would only be
// testing js-yaml.
describe('_extractGroupedTestCases', () => {
  describe('test definition behaviours', () => {
    test('generates a renderExampleUrl for each test', () => {
      const result = _extractGroupedTestCases([{
        type: 'single_widget_single_page',
        testname: 'testname1',
        groupname: 'groupname1',
        data: 'data'
      }])

      expect(decodeRenderExampleUrl(result[0].tests[0])).toEqual({
        testname: 'testname1',
        type: 'single_widget_single_page',
        widgets: [{ config: ['data'] }]
      })
    })

    test('groups by groupname, preserving the order tests were declared in', () => {
      const result = _extractGroupedTestCases([
        singleWidgetSinglePage({ testname: 'T1', data: 'D1', groupname: 'a' }),
        singleWidgetSinglePage({ testname: 'T2', data: 'D2', groupname: 'b' }),
        singleWidgetSinglePage({ testname: 'T3', data: 'D3', groupname: 'a' })
      ])

      expect(result).toHaveLength(2)
      expect(result.map(group => group.groupName)).toEqual(['a', 'b'])
      expect(result[0].tests.map(test => test.testname)).toEqual(['T1', 'T3'])
      expect(result[1].tests.map(test => test.testname)).toEqual(['T2'])
    })

    // NB a widget config is assembled by concatenating the data and config entries, either of
    // which can come back from the yaml as an empty string. Empty parts have to be dropped rather
    // than passed on, because each part becomes a path segment in the renderExample url.
    test('strips empty config parts', () => {
      const result = _extractGroupedTestCases([{
        type: 'single_widget_single_page',
        testname: 'testname',
        groupname: 'a',
        data: 'data',
        config: ''
      }])

      expect(result[0].tests[0].widgets).toEqual([{ config: ['data'] }])
    })

    describe('parsing and placing comments', () => {
      test('places comments by data name and by index in single_page_one_example_per_data', () => {
        const result = _extractGroupedTestCases([{
          title: 'title',
          testname: 'testname',
          groupname: 'a',
          width: 400,
          height: 200,
          rowSize: 2,
          type: 'single_page_one_example_per_data',
          comments: [
            { location: 'data2', text: 'this test is broken', status: 'red' },
            { location: 0, text: 'this test shows some undesirable behaviour', status: 'yellow' }
          ],
          data: ['data1', 'data2', 'data3']
        }])

        expect(stripRenderExampleUrls(result)[0].tests[0].widgets).toEqual([
          { config: ['data1'], comment: 'this test shows some undesirable behaviour', status: 'yellow' },
          { config: ['data2'], comment: 'this test is broken', status: 'red' },
          { config: ['data3'] }
        ])
      })

      test('places comments by file name in for_each_data_in_directory', () => {
        const fs = { readdirSync: jest.fn().mockReturnValue(['file1.json', 'file2.json', 'file3.json']) }

        const result = _extractGroupedTestCases([{
          testname: 'testname',
          groupname: 'a',
          type: 'for_each_data_in_directory',
          data_directory: 'data/dir',
          comments: [
            { location: 'file2', text: 'this test is broken', status: 'red' },
            { location: 'file1', text: 'this test shows some undesirable behaviour', status: 'yellow' }
          ]
        }], { fs })

        expect(stripRenderExampleUrls(result)[0].tests).toEqual([
          {
            testname: 'a data.dir.file1',
            type: 'for_each_data_in_directory',
            widgets: [{
              config: ['data.dir.file1'],
              comment: 'this test shows some undesirable behaviour',
              status: 'yellow'
            }]
          },
          {
            testname: 'a data.dir.file2',
            type: 'for_each_data_in_directory',
            widgets: [{
              config: ['data.dir.file2'],
              comment: 'this test is broken',
              status: 'red'
            }]
          },
          {
            testname: 'a data.dir.file3',
            type: 'for_each_data_in_directory',
            widgets: [{ config: ['data.dir.file3'] }]
          }
        ])
      })

      // NB for_each_data_in_directory generates one test case per data file, each holding a single
      // widget, so a numeric comment location has to be matched against the test case index rather
      // than the index of the widget within a case. index.js has a TODO to drop numeric locations
      // for this type in favour of file names, which is what the test above uses.
      test('places a numeric index comment on the matching generated case in for_each_data_in_directory', () => {
        const fs = { readdirSync: jest.fn().mockReturnValue(['a.json', 'b.json', 'c.json']) }

        const result = _extractGroupedTestCases([{
          testname: 'testname',
          groupname: 'a',
          type: 'for_each_data_in_directory',
          data_directory: 'data/dir',
          comments: [{ location: 1, text: 'the second file is broken', status: 'red' }]
        }], { fs })

        expect(result[0].tests.map(test => test.widgets[0])).toEqual([
          { config: ['data.dir.a'] },
          { config: ['data.dir.b'], comment: 'the second file is broken', status: 'red' },
          { config: ['data.dir.c'] }
        ])
      })

      test('defaults a comment with no status to red', () => {
        const result = _extractGroupedTestCases([{
          type: 'single_page_one_example_per_data',
          testname: 'testname',
          groupname: 'a',
          comments: [{ location: 'data2', text: 'no status given' }],
          data: ['data1', 'data2']
        }])

        expect(stripRenderExampleUrls(result)[0].tests[0].widgets).toEqual([
          { config: ['data1'] },
          { config: ['data2'], comment: 'no status given', status: 'red' }
        ])
      })
    })
  })

  describe('test definition formats', () => {
    test('handles single_widget_single_page', () => {
      const result = _extractGroupedTestCases([{
        type: 'single_widget_single_page',
        testname: 'testname',
        groupname: 'a',
        width: 600,
        height: 400,
        data: 'data'
      }])

      expect(stripRenderExampleUrls(result)).toEqual([{
        tests: [{
          testname: 'testname',
          type: 'single_widget_single_page',
          width: 600,
          height: 400,
          widgets: [{ config: ['data'] }]
        }],
        groupName: 'a'
      }])
    })

    test('handles multi_widget_single_page', () => {
      const result = _extractGroupedTestCases([{
        type: 'multi_widget_single_page',
        testname: 'testname',
        groupname: 'a',
        rowSize: 1,
        height: 10,
        width: 10,
        widgets: [
          { height: 20, width: 20, config: ['config1'] },
          { config: ['config2_is_array'] },
          { config: 'config3_is_string' }
        ]
      }])

      expect(stripRenderExampleUrls(result)).toEqual([{
        tests: [{
          testname: 'testname',
          type: 'multi_widget_single_page',
          width: 10,
          height: 10,
          rowSize: 1,
          widgets: [
            { height: 20, width: 20, config: ['config1'] },
            { config: ['config2_is_array'] },
            { config: ['config3_is_string'] }
          ]
        }],
        groupName: 'a'
      }])
    })

    // NB one test case per entry in configs, unlike the single_page formats which put every config
    // into one test case. The per entry testname is what makes them separate pages.
    test('handles multi_widget_multi_page, taking a testname from the title when given', () => {
      const result = _extractGroupedTestCases([{
        type: 'multi_widget_multi_page',
        testname: 'testname',
        groupname: 'a',
        width: 300,
        configs: [
          'dir.configA',
          { config: 'dir.configB', title: 'B title' }
        ]
      }])

      expect(stripRenderExampleUrls(result)).toEqual([{
        tests: [
          {
            testname: 'configA',
            type: 'multi_widget_multi_page',
            width: 300,
            widgets: [{ config: ['dir.configA'] }]
          },
          {
            testname: 'B title',
            type: 'multi_widget_multi_page',
            width: 300,
            widgets: [{ config: ['dir.configB'], title: 'B title' }]
          }
        ],
        groupName: 'a'
      }])
    })

    test('handles single_page_one_example_per_config', () => {
      const result = _extractGroupedTestCases([{
        title: 'title',
        testname: 'testname',
        groupname: 'a',
        width: 400,
        height: 200,
        type: 'single_page_one_example_per_config',
        comments: [],
        data: 'data1',
        config: ['config1', 'config2']
      }])

      expect(stripRenderExampleUrls(result)).toEqual([{
        tests: [{
          testname: 'testname',
          title: 'title',
          type: 'single_page_one_example_per_config',
          width: 400,
          height: 200,
          widgets: [
            { config: ['data1', 'config1'] },
            { config: ['data1', 'config2'] }
          ]
        }],
        groupName: 'a'
      }])
    })

    test('handles single_page_one_example_per_data', () => {
      const result = _extractGroupedTestCases([{
        title: 'title',
        testname: 'testname',
        groupname: 'a',
        width: 400,
        height: 200,
        rowSize: 2,
        type: 'single_page_one_example_per_data',
        data: ['data1', 'data2']
      }])

      expect(stripRenderExampleUrls(result)).toEqual([{
        tests: [{
          testname: 'testname',
          title: 'title',
          type: 'single_page_one_example_per_data',
          width: 400,
          height: 200,
          rowSize: 2,
          widgets: [
            { config: ['data1'] },
            { config: ['data2'] }
          ]
        }],
        groupName: 'a'
      }])
    })

    test('handles for_each_data_in_directory', () => {
      const fs = { readdirSync: jest.fn().mockReturnValue(['a.json', 'b.json']) }

      const result = _extractGroupedTestCases([{
        data_directory: 'data/dir',
        testname: 'testname',
        groupname: 'a',
        type: 'for_each_data_in_directory',
        use_config_as_title: true
      }], { fs })

      expect(fs.readdirSync).toHaveBeenCalledWith(path.join(fakeBasePath, 'theSrc', 'internal_www', 'data/dir'))

      expect(stripRenderExampleUrls(result)).toEqual([{
        tests: [
          {
            testname: 'a data.dir.a',
            type: 'for_each_data_in_directory',
            widgets: [{ config: ['data.dir.a'] }],
            title: 'data.dir.a'
          },
          {
            testname: 'a data.dir.b',
            type: 'for_each_data_in_directory',
            widgets: [{ config: ['data.dir.b'] }],
            title: 'data.dir.b'
          }
        ],
        groupName: 'a'
      }])
    })

    test('honours excluded_files in for_each_data_in_directory', () => {
      const fs = { readdirSync: jest.fn().mockReturnValue(['a.json', 'b.json', 'c.json', 'notdata.txt']) }

      const result = _extractGroupedTestCases([{
        data_directory: 'data/dir',
        testname: 'testname',
        groupname: 'a',
        type: 'for_each_data_in_directory',
        excluded_files: ['b']
      }], { fs })

      expect(result[0].tests.map(test => test.widgets[0].config)).toEqual([
        ['data.dir.a'],
        ['data.dir.c']
      ])
    })
  })

  describe('validation', () => {
    test('rejects an unknown type', () => {
      expect(() => _extractGroupedTestCases([
        { type: 'not_a_real_type', testname: 'testname', groupname: 'a', data: 'data' }
      ])).toThrow(/invalid type not_a_real_type/)
    })

    test('rejects a test definition with no type', () => {
      expect(() => _extractGroupedTestCases([
        { testname: 'testname', groupname: 'a', data: 'data' }
      ])).toThrow(/missing type/)
    })

    // NB _loadConfigs defaults testname from the file path, so this guard only fires for callers
    // that build test definitions by hand.
    test('rejects a test definition with no testname', () => {
      expect(() => _extractGroupedTestCases([
        { type: 'single_widget_single_page', groupname: 'a', data: 'data' }
      ])).toThrow(/missing testname/)
    })

    test('rejects a non numeric width', () => {
      expect(() => _extractGroupedTestCases([
        { type: 'single_widget_single_page', testname: 'testname', groupname: 'a', data: 'data', width: 'wide' }
      ])).toThrow(/invalid width: wide/)
    })

    test('rejects a for_each_data_in_directory with neither data nor data_directory', () => {
      expect(() => _extractGroupedTestCases([
        { type: 'for_each_data_in_directory', testname: 'testname', groupname: 'a' }
      ])).toThrow(/must contain 'data' or 'data_directory'/)
    })
  })
})

// NB the url is base64 encoded json, so it is opaque to a deep equal. Tests either decode it or
// strip it and assert on the config that went into it.
function decodeRenderExampleUrl (testDefinition) {
  const [, configString] = testDefinition.renderExampleUrl.split('=')
  return JSON.parse(Buffer.from(configString, 'base64').toString('utf8'))
}

function singleWidgetSinglePage ({ testname, data, groupname }) {
  return { type: 'single_widget_single_page', testname, groupname, data }
}

function stripRenderExampleUrls (testPlan) {
  testPlan.forEach(group => {
    group.tests.forEach(test => {
      delete test.renderExampleUrl
    })
  })

  return testPlan
}
