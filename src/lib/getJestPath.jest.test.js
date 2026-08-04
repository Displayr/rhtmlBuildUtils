const fs = require('fs')
const path = require('path')

const getJestPath = require('./getJestPath')

const widgetConfig = { basePath: path.join(path.sep, 'widget', 'repo') }
const buildRoot = path.join(path.sep, 'build', 'root')

// NB npm installs an extensionless sh launcher and a .cmd launcher side by side on windows. The
// extensionless one exists there too, so picking it passes existsSync and then fails in cmd.exe.
const expectedBinary = (process.platform === 'win32') ? 'jest.cmd' : 'jest'
const binIn = root => path.join(root, 'node_modules', '.bin', expectedBinary)

afterEach(() => jest.restoreAllMocks())

test('picks the launcher the current platform can execute', () => {
  jest.spyOn(fs, 'existsSync').mockReturnValue(true)

  expect(path.basename(getJestPath({ buildRoot, widgetConfig }))).toBe(expectedBinary)
})

test('prefers the widget repo install over the build root install', () => {
  jest.spyOn(fs, 'existsSync').mockReturnValue(true)

  expect(getJestPath({ buildRoot, widgetConfig })).toBe(binIn(widgetConfig.basePath))
})

test('falls back to the build root install, to support npm link rhtmlBuildUtils', () => {
  jest.spyOn(fs, 'existsSync').mockImplementation(candidate => candidate === binIn(buildRoot))

  expect(getJestPath({ buildRoot, widgetConfig })).toBe(binIn(buildRoot))
})

test('throws listing both candidates when jest is not installed anywhere', () => {
  jest.spyOn(fs, 'existsSync').mockReturnValue(false)

  expect(() => getJestPath({ buildRoot, widgetConfig }))
    .toThrow(`Could not find jest at these locations: ${binIn(widgetConfig.basePath)},${binIn(buildRoot)}`)
})
