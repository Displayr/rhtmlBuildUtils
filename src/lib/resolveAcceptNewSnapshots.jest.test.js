const fs = require('fs-extra')
const os = require('os')
const path = require('path')

const resolveAcceptNewSnapshots = require('./resolveAcceptNewSnapshots')

let basePath

const widgetConfigFor = () => ({
  basePath,
  snapshotTesting: {
    branch: 'master',
    env: 'local',
    snapshotDirectory: 'theSrc/test/snapshots'
  }
})

const seedSet = (env, branch) =>
  fs.outputFileSync(path.join(basePath, 'theSrc/test/snapshots', env, branch, 'a-snap.png'), 'png')

beforeEach(() => { basePath = fs.mkdtempSync(path.join(os.tmpdir(), 'accept-')) })
afterEach(() => fs.removeSync(basePath))

// NB the case that made a flat strict default wrong. Snapshot sets are per branch, every widget's
// localTest passes the current branch, and nothing seeds a new branch from master -- so the first run
// on a feature branch legitimately has no baselines at all.
test('seeds a branch that has never been baselined', () => {
  const resolved = resolveAcceptNewSnapshots({ widgetConfig: widgetConfigFor(), args: { branch: 'feature-x' } })

  expect(resolved.acceptNewSnapshots).toBe(true)
  expect(resolved.seeding).toBe(true)
  expect(resolved.existingCount).toBe(0)
})

// NB and the case that made the strict default necessary: a new test added to a set that already
// exists must fail rather than quietly writing its own baseline and passing forever.
test('is strict once the set holds baselines', () => {
  seedSet('local', 'master')

  const resolved = resolveAcceptNewSnapshots({ widgetConfig: widgetConfigFor(), args: {} })

  expect(resolved.acceptNewSnapshots).toBe(false)
  expect(resolved.seeding).toBe(false)
  expect(resolved.existingCount).toBe(1)
})

// baseConfigureImageSnapshotMatcher mkdirp's the set inside the jest child, so an aborted run leaves an
// empty directory. Treating that as baselined would fail every test on the retry.
test('treats an empty directory left by an aborted run as not baselined', () => {
  fs.mkdirpSync(path.join(basePath, 'theSrc/test/snapshots/local/master'))

  expect(resolveAcceptNewSnapshots({ widgetConfig: widgetConfigFor(), args: {} }).seeding).toBe(true)
})

test('ignores diff output when deciding, since it is not a baseline', () => {
  fs.outputFileSync(path.join(basePath, 'theSrc/test/snapshots/local/master/__diff_output__/a-snap-diff.png'), 'png')

  expect(resolveAcceptNewSnapshots({ widgetConfig: widgetConfigFor(), args: {} }).seeding).toBe(true)
})

test('an explicit --acceptNewSnapshots still wins over an existing set', () => {
  seedSet('local', 'master')

  const resolved = resolveAcceptNewSnapshots({
    widgetConfig: widgetConfigFor(),
    args: { acceptNewSnapshots: true }
  })

  expect(resolved.acceptNewSnapshots).toBe(true)
  expect(resolved.seeding).toBe(false)
})

describe('which set it looks at', () => {
  test('follows --env and --branch over the widget defaults', () => {
    seedSet('ci', 'release')

    const strict = resolveAcceptNewSnapshots({
      widgetConfig: widgetConfigFor(),
      args: { env: 'ci', branch: 'release' }
    })
    const seeding = resolveAcceptNewSnapshots({
      widgetConfig: widgetConfigFor(),
      args: { env: 'ci', branch: 'other' }
    })

    expect(strict.seeding).toBe(false)
    expect(seeding.seeding).toBe(true)
  })

  test('falls back to the widget config when no flags are given', () => {
    seedSet('local', 'master')

    expect(resolveAcceptNewSnapshots({ widgetConfig: widgetConfigFor(), args: {} }).seeding).toBe(false)
  })

  test('reports the set it inspected, for the log line', () => {
    const { setRoot } = resolveAcceptNewSnapshots({ widgetConfig: widgetConfigFor(), args: { branch: 'feature-x' } })

    expect(setRoot).toBe(path.join(basePath, 'theSrc/test/snapshots', 'local', 'feature-x'))
  })
})
