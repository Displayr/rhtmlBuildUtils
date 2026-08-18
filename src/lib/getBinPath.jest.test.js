const fs = require('fs')
const path = require('path')

const getBinPath = require('./getBinPath')

const widgetConfig = { basePath: path.join(path.sep, 'widget', 'repo') }
const buildRoot = path.join(path.sep, 'build', 'root')

// NB npm installs an extensionless sh launcher and a .cmd launcher side by side on windows. The
// extensionless one exists there too, so picking it passes existsSync and then fails in cmd.exe.
const launcher = name => (process.platform === 'win32') ? `${name}.cmd` : name
const binIn = (root, name) => path.join(root, 'node_modules', '.bin', launcher(name))

afterEach(() => jest.restoreAllMocks())

test('picks the launcher the current platform can execute', () => {
  jest.spyOn(fs, 'existsSync').mockReturnValue(true)

  expect(path.basename(getBinPath({ name: 'eslint', buildRoot, widgetConfig }))).toBe(launcher('eslint'))
})

test('prefers the widget repo install over the build root install', () => {
  jest.spyOn(fs, 'existsSync').mockReturnValue(true)

  expect(getBinPath({ name: 'eslint', buildRoot, widgetConfig })).toBe(binIn(widgetConfig.basePath, 'eslint'))
})

test('falls back to the build root install, to support npm link rhtmlBuildUtils', () => {
  jest.spyOn(fs, 'existsSync').mockImplementation(candidate => candidate === binIn(buildRoot, 'eslint'))

  expect(getBinPath({ name: 'eslint', buildRoot, widgetConfig })).toBe(binIn(buildRoot, 'eslint'))
})

test('names the requested binary when it is not installed anywhere', () => {
  jest.spyOn(fs, 'existsSync').mockReturnValue(false)

  expect(() => getBinPath({ name: 'eslint', buildRoot, widgetConfig }))
    .toThrow(`Could not find eslint at these locations: ${binIn(widgetConfig.basePath, 'eslint')},${binIn(buildRoot, 'eslint')}`)
})

// The lint task asks for eslint and jestSpecTests asks for jest through the same helper, so the
// binary name must not be baked into either the lookup or the error message.
test('looks up a different binary without leaking the previous name', () => {
  jest.spyOn(fs, 'existsSync').mockReturnValue(true)

  expect(getBinPath({ name: 'jest', buildRoot, widgetConfig })).toBe(binIn(widgetConfig.basePath, 'jest'))
})
