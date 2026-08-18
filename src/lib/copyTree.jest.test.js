const fs = require('fs-extra')
const os = require('os')
const path = require('path')

const copyTree = require('./copyTree')

let root

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'copytree-'))
  fs.outputFileSync(path.join(root, 'theSrc/test/experiments/varyFont/testplan.yaml'), 'plan')
  fs.outputFileSync(path.join(root, 'theSrc/test/experiments/varyFont/nested/page.html'), 'page')
})

afterEach(() => fs.removeSync(root))

const treeUnder = (directory) => {
  if (!fs.existsSync(directory)) { return [] }
  return fs
    .readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => path.relative(directory, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'))
    .sort()
}

// NB fast-glob returns paths relative to cwd that still carry the pattern's own directory prefix:
// ['theSrc/test/experiments/varyFont/testplan.yaml'], not ['varyFont/testplan.yaml']. gulp.src set the
// base to the non-magic prefix of the glob and gulp.dest wrote relative to that, so without an explicit
// base every file lands one whole directory tree too deep -- and the experiment UI, which fetches
// /experiments/<name>/testplan.yaml, 404s on every page.
test('strips the base, so the tree lands at the destination root', async () => {
  const destination = path.join(root, 'browser/experiments')

  await copyTree({
    cwd: root,
    patterns: ['theSrc/test/experiments/**/*'],
    base: 'theSrc/test/experiments',
    destination
  })

  expect(treeUnder(destination)).toEqual(['varyFont/nested/page.html', 'varyFont/testplan.yaml'])
})

// The second call site in copyExperimentHtmlAndSnapshots relies on this: its cwd is already the asset
// root, so its matches carry no prefix to strip.
test('keeps the cwd relative path when no base is given', async () => {
  const destination = path.join(root, 'browser/ui')

  await copyTree({
    cwd: path.join(root, 'theSrc/test/experiments'),
    patterns: ['**/*.yaml'],
    destination
  })

  expect(treeUnder(destination)).toEqual(['varyFont/testplan.yaml'])
})

test('copies file contents, not just the paths', async () => {
  const destination = path.join(root, 'browser/experiments')

  await copyTree({
    cwd: root,
    patterns: ['theSrc/test/experiments/**/*'],
    base: 'theSrc/test/experiments',
    destination
  })

  expect(fs.readFileSync(path.join(destination, 'varyFont/testplan.yaml'), 'utf8')).toBe('plan')
})
