const fs = require('fs-extra')
const os = require('os')
const path = require('path')

// NB widgetConfig reads a build/config/widget.config from the consuming widget project, which does not
// exist in this repo, so it is stubbed. basePath is a real temp directory because these tests assert on
// the diagnostic png that testSnapshots writes when a comparison fails.
const mockBasePath = fs.mkdtempSync(path.join(os.tmpdir(), 'rbu-helper-'))

jest.mock('./widgetConfig', () => ({
  basePath: mockBasePath,
  snapshotTesting: {
    snapshotDelay: 0,
    snapshotDirectory: 'theSrc/test/snapshots',
    env: 'local',
    branch: 'master',
    timeout: 1000,
    pixelmatch: {}
  },
  internalWebSettings: {
    singleWidgetSnapshotSelector: '.widget',
    statePreprocessor: x => x
  }
}))

const { testSnapshots } = require('./renderExamplePageTest.helper')

const newSnapshotsDir = path.join(mockBasePath, 'theSrc/test/snapshots/local/master/new_snapshots')

// A page whose $$ resolves `count` fake widgets, each screenshotting to a distinct buffer.
const fakePage = (count) => ({
  $$: async () => Array.from({ length: count }, (_unused, index) => ({
    screenshot: async () => Buffer.from(`image-${index}`)
  }))
})

// Replaces the real jest-image-snapshot matcher so a comparison can be made to fail on demand without
// any actual image diffing. testSnapshots calls expect(image).toMatchImageSnapshot({...}).
const matcherFailingFor = (failingIdentifiers) => {
  expect.extend({
    toMatchImageSnapshot (received, { customSnapshotIdentifier }) {
      const pass = !failingIdentifiers.includes(customSnapshotIdentifier)
      return { pass, message: () => `stub matcher: ${customSnapshotIdentifier} did not match` }
    }
  })
}

beforeEach(() => fs.removeSync(newSnapshotsDir))
afterAll(() => fs.removeSync(mockBasePath))

test('resolves when every snapshot matches', async () => {
  matcherFailingFor([])

  await expect(testSnapshots({ page: fakePage(1), testName: 'all good' })).resolves.toBeUndefined()
})

// This is the regression the whole fix is for. The catch used to swallow the matcher's throw, so a test
// whose images did not match reported PASS -- the job only went red via jest's aggregate
// snapshotState.unmatched count, and reading the per-test list led to the wrong conclusion.
test('REJECTS when a snapshot does not match, rather than reporting pass', async () => {
  matcherFailingFor(['a_mismatch'])

  await expect(testSnapshots({ page: fakePage(1), testName: 'a mismatch' }))
    .rejects.toThrow(/1 snapshot\(s\) did not match: a_mismatch/)
})

test('names every failure, not just the first', async () => {
  matcherFailingFor(['multi-one', 'multi-three'])

  const promise = testSnapshots({
    page: fakePage(3),
    testName: 'multi',
    snapshotNames: ['one', 'two', 'three']
  })

  await expect(promise).rejects.toThrow(/2 snapshot\(s\) did not match: multi-one, multi-three/)
})

// Throwing from inside the loop would abort it, losing the diagnostic image for every widget after the
// first failure. Collecting and rethrowing at the end keeps the full set.
test('writes a diagnostic png for every failure, including ones after the first', async () => {
  matcherFailingFor(['multi-one', 'multi-three'])

  await expect(testSnapshots({
    page: fakePage(3),
    testName: 'multi',
    snapshotNames: ['one', 'two', 'three']
  })).rejects.toThrow()

  expect(fs.readdirSync(newSnapshotsDir).sort()).toEqual(['multi-one-snap.png', 'multi-three-snap.png'])
})

// The previous implementation used the fs.writeFile callback form and never awaited it, so the process
// could exit before the diagnostic image reached disk.
test('the diagnostic png is on disk by the time the rejection surfaces', async () => {
  matcherFailingFor(['sync_check'])

  await expect(testSnapshots({ page: fakePage(1), testName: 'sync check' })).rejects.toThrow()

  const written = path.join(newSnapshotsDir, 'sync_check-snap.png')
  expect(fs.existsSync(written)).toBe(true)
  expect(fs.readFileSync(written).toString()).toBe('image-0')
})

test('writes nothing to new_snapshots when everything matches', async () => {
  matcherFailingFor([])

  await testSnapshots({ page: fakePage(2), testName: 'clean run', snapshotNames: ['a', 'b'] })

  expect(fs.existsSync(newSnapshotsDir)).toBe(false)
})
