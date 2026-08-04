const path = require('path')

// NB processTestPlans pulls in widgetConfig, which requires a build/config/widget.config
// from the consuming widget project. That file does not exist in this repo, so stub it out.
jest.mock('../widgetConfig', () => ({ basePath: '/fake/project' }))

const { _extractGroupFromPath, _extractTestNameFromPath } = require('./index')

// NB fixtures are built with path.join so each OS exercises its own separator. Hardcoding a
// backslash would prove nothing on linux, where '\' is a legal filename character rather than
// a separator. The explicit posix cases below cover the separator that is valid on both.
describe('_extractGroupFromPath', () => {
  const baseDir = path.join(path.sep === '/' ? '/foo' : 'C:\\foo', 'bar')

  test('returns the file name for a test plan directly in the base dir', () => {
    expect(_extractGroupFromPath(baseDir, path.join(baseDir, 'anonymised_samples.yaml')))
      .toBe('anonymised_samples')
  })

  test('returns the sub directory for a nested test plan', () => {
    expect(_extractGroupFromPath(baseDir, path.join(baseDir, 'functional_tests', 'color_variations.yaml')))
      .toBe('functional_tests')
  })

  test('returns the top sub directory for a deeply nested test plan', () => {
    expect(_extractGroupFromPath(baseDir, path.join(baseDir, 'functional_tests', 'colors', 'variations.yaml')))
      .toBe('functional_tests')
  })

  test('tolerates a trailing separator on the base dir', () => {
    expect(_extractGroupFromPath(`${baseDir}${path.sep}`, path.join(baseDir, 'functional_tests', 'color_variations.yaml')))
      .toBe('functional_tests')
  })

  test('handles posix separators regardless of host os', () => {
    expect(_extractGroupFromPath('/foo/bar', '/foo/bar/functional_tests/color_variations.yaml'))
      .toBe('functional_tests')
  })
})

describe('_extractTestNameFromPath', () => {
  test('strips the directories and the yaml extension', () => {
    expect(_extractTestNameFromPath(path.join('foo', 'bar', 'color_variations.yaml')))
      .toBe('color_variations')
  })

  test('strips the directories and the json extension', () => {
    expect(_extractTestNameFromPath(path.join('foo', 'bar', 'color_variations.json')))
      .toBe('color_variations')
  })

  test('handles a bare file name', () => {
    expect(_extractTestNameFromPath('color_variations.json')).toBe('color_variations')
  })

  test('handles posix separators regardless of host os', () => {
    expect(_extractTestNameFromPath('/foo/bar/color_variations.yaml')).toBe('color_variations')
  })

  test('only strips the extension, not a matching substring of the name', () => {
    expect(_extractTestNameFromPath('myamlz.yaml')).toBe('myamlz')
  })
})
