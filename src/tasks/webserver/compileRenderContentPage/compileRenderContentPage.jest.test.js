// NB widgetConfig requires a build/config/widget.config from the consuming widget project, which
// does not exist in this repo, so it is stubbed out. compileES6 is stubbed to keep esbuild out of
// this test; only the template variables handed to createFileFromTemplate are under test.
jest.mock('../../../lib/widgetConfig', () => ({
  basePath: '/widget/repo',
  widgetFactory: 'theSrc/scripts/rhtmlYourWidget.factory.js',
  internalWebSettings: { default_width: 200 }
}))
jest.mock('../../../lib/createFileFromTemplate', () => jest.fn())
jest.mock('../../../lib/compileES6', () => jest.fn())

const createFileFromTemplate = require('../../../lib/createFileFromTemplate')
const compileRenderContentPage = require('./index')

const runTask = () => {
  const gulp = {}
  compileRenderContentPage(gulp)(() => {})
  return createFileFromTemplate.mock.calls[0][0].templateVariables
}

test('widget_definition_path is a posix module specifier on every platform', () => {
  // NB this value is interpolated into a require() in the generated renderContentPage.js. A
  // windows '\' would be read as a string escape there ('\t' becomes a tab), so it must be '/'.
  expect(runTask().widget_definition_path).toBe('../theSrc/scripts/rhtmlYourWidget.factory.js')
})

test('widget_definition_path survives a round trip through the javascript parser', () => {
  const specifier = runTask().widget_definition_path
  const asWrittenIntoTheTemplate = `'${specifier}'`

  // eslint-disable-next-line no-new-func
  expect(new Function(`return ${asWrittenIntoTheTemplate}`)()).toBe(specifier)
})

test('internalWebSettings are still merged into the template variables', () => {
  expect(runTask().default_width).toBe(200)
})
