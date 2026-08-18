const { execFileSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const configPath = require.resolve('../../eslint.config.base.js')
// By path, not require.resolve: eslint's package.json "exports" does not expose bin/.
const eslintBin = path.resolve(__dirname, '..', '..', 'node_modules', 'eslint', 'bin', 'eslint.js')

// The widget repos consume this config through a one line re-export (see the README), and flat config
// `files` globs resolve against the CONSUMING project's root -- not against the file that declared
// them. So a widget path is only ever covered by a glob written here, and nothing in this repo's own
// tree exercises those globs: linting rhtmlBuildUtils cannot tell you whether a widget repo lints.
// Both times that gap has bitten (theSrc/scripts, then theSrc/test) it was found by hand, in a widget
// repo, after the config had already been reviewed. These fixtures close it by linting a throwaway
// project laid out the way a widget repo is.

const createdRoots = []

const writeFile = (root, relativePath, contents) => {
  const target = path.join(root, relativePath)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, contents)
}

const widgetFixture = (files) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rhtml-eslint-'))
  createdRoots.push(root)

  // rhtmlBuildUtils is stubbed into the fixture's node_modules and declared as a devDependency so the
  // config can be required BY PACKAGE NAME -- verbatim the one line the README tells a widget repo to
  // add. An absolute path require would also work, but a path require is not a dependency reference,
  // so n/no-unpublished-require would have nothing to check, and the fixture would not resemble a real
  // widget repo's dependency graph -- which is how that rule went unnoticed the first time.
  //
  // NB the config has to be a real file at the fixture root: flat config resolves `files` globs against
  // the directory holding the config that is in effect, so passing --config would anchor the widget
  // globs at THIS repo and match nothing -- the very failure mode being guarded against, arriving
  // through the test harness instead of the config.
  stubPackage(root, 'rhtmlBuildUtils', {
    'eslint.config.base.js': `module.exports = require(${JSON.stringify(configPath)})\n`
  })
  writeFile(root, 'eslint.config.js', 'module.exports = require(\'rhtmlBuildUtils/eslint.config.base\')\n')

  writeFile(root, 'package.json', JSON.stringify({
    name: 'fixture-widget',
    version: '1.0.0',
    // eslint-plugin-n judges API availability against this, so the fixture declares the same floor the
    // real widget repos do -- otherwise the n/* results here would not match theirs.
    engines: { node: '^20.19.0 || ^22.13.0 || >=24' },
    // NB a devDependency, which is how the README says to install it, and what makes
    // n/no-unpublished-require reachable: the package IS declared, just not as a runtime dependency.
    devDependencies: { rhtmlBuildUtils: 'github:Displayr/rhtmlBuildUtils#9.0.0' }
  }))

  Object.entries(files).forEach(([relativePath, contents]) => writeFile(root, relativePath, contents))

  return root
}

// A widget repo does not declare puppeteer: it comes from rhtmlBuildUtils, which owns the browser
// version because that version decides whether the image baselines are valid. Installed but not
// declared is therefore the real situation, and it is what makes n/no-extraneous-require fire rather
// than n/no-missing-require. Stubbing it reproduces that, instead of the different -- and misleading
// -- result an uninstalled package would give.
const stubPackage = (root, name, extraFiles = {}) => {
  writeFile(root, path.join('node_modules', name, 'package.json'), JSON.stringify({
    name,
    version: '1.0.0',
    main: 'index.js'
  }))
  writeFile(root, path.join('node_modules', name, 'index.js'), 'module.exports = {}\n')
  Object.entries(extraFiles).forEach(([relativePath, contents]) =>
    writeFile(root, path.join('node_modules', name, relativePath), contents))
}

const installUndeclared = (root, name) => stubPackage(root, name)

// Shells out rather than using the ESLint class, for two reasons: it is the same path `rhtml lint`
// takes (src/tasks/misc/lint.js also spawns the cli), and eslint 10's programmatic lintFiles reaches
// for a dynamic import that jest's CommonJS vm refuses without --experimental-vm-modules.
const lintWidget = (root, targets = ['theSrc']) => {
  let stdout
  try {
    stdout = execFileSync(process.execPath, [eslintBin, '--format', 'json', ...targets], {
      cwd: root,
      encoding: 'utf8'
    })
  } catch (error) {
    // eslint exits 1 when it reports anything, and 2 when it could not run at all.
    if (error.status !== 1) {
      throw new Error(`eslint could not run: ${error.stderr || error.message}`, { cause: error })
    }
    stdout = error.stdout
  }

  return JSON.parse(stdout).flatMap(result => result.messages.map(message => [
    path.relative(root, result.filePath).split(path.sep).join('/'),
    message.ruleId || 'parse error',
    message.message
  ].join(' | ')))
}

afterEach(() => {
  while (createdRoots.length) {
    fs.rmSync(createdRoots.pop(), { recursive: true, force: true })
  }
})

test('accepts a widget source file, which is browser ES modules', () => {
  const root = widgetFixture({
    'theSrc/scripts/widget.js': `
import _ from 'lodash'

export default function render (element) {
  return _.size(element) + window.innerWidth
}
`.trimStart()
  })

  expect(lintWidget(root)).toEqual([])
})

test('accepts an interaction test, whose page.evaluate callbacks run in the browser', () => {
  const root = widgetFixture({
    'theSrc/test/bin/interaction.jest.test.js': `
const loadWidget = require('../lib/loadWidget.helper')

test('reads a browser global inside an evaluate callback', async () => {
  const page = await loadWidget()
  const count = await page.evaluate(() => document.querySelectorAll('.point').length + window.innerWidth)
  expect(count).toBeGreaterThan(0)
})
`.trimStart(),
    'theSrc/test/lib/loadWidget.helper.js': `
module.exports = async function loadWidget () {
  return { evaluate: callback => callback() }
}
`.trimStart()
  })

  expect(lintWidget(root)).toEqual([])
})

// rhtmlDonut has one of these: theSrc/test/utils/addTestFixturesToWindow.js.
test('accepts an ES module helper under the test tree', () => {
  const root = widgetFixture({
    'theSrc/test/utils/addTestFixturesToWindow.js': `
import fixtures from './fixtures'

export default function addTestFixturesToWindow () {
  window.fixtures = fixtures
}
`.trimStart(),
    'theSrc/test/utils/fixtures.js': `
export default {}
`.trimStart()
  })

  expect(lintWidget(root)).toEqual([])
})

test('accepts puppeteer in the test tree, which the widget repo deliberately does not declare', () => {
  const root = widgetFixture({
    'theSrc/test/bin/launch.jest.test.js': `
const puppeteer = require('puppeteer')

test('launches', () => expect(puppeteer).toBeDefined())
`.trimStart()
  })
  installUndeclared(root, 'puppeteer')

  expect(lintWidget(root)).toEqual([])
})

// The override must not turn the test tree into an unchecked directory.
test('still reports a require that resolves to nothing in the test tree', () => {
  const root = widgetFixture({
    'theSrc/test/bin/typo.jest.test.js': `
const helper = require('../lib/nosuchhelper')

test('uses the helper', () => expect(helper).toBeDefined())
`.trimStart()
  })

  expect(lintWidget(root)).toEqual([
    expect.stringContaining('n/no-missing-require')
  ])
})

// NB rhtmlBuildUtils trips a DIFFERENT rule than puppeteer, which is why the override above did not
// cover it. puppeteer is absent from a widget's package.json entirely, which is n/no-extraneous-require.
// rhtmlBuildUtils IS declared -- as a devDependency, exactly as the README instructs -- and the files
// requiring it are ones npm would publish, since a widget repo sets neither `files` nor `.npmignore`.
// That is n/no-unpublished-require, and the two requires sit on adjacent lines in the same files.
test('accepts the shared config required by name from a widget eslint.config.js', () => {
  const root = widgetFixture({})

  expect(lintWidget(root, ['eslint.config.js'])).toEqual([])
})

test('accepts rhtmlBuildUtils required by name from the test tree', () => {
  const root = widgetFixture({
    'theSrc/test/lib/loadWidget.helper.js': `
const { lib } = require('rhtmlBuildUtils')

module.exports = () => lib
`.trimStart()
  })

  expect(lintWidget(root)).toEqual([])
})
