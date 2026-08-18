const buildSnapshotJestCommand = require('./snapshotJestCommand')

const build = (args = {}) => buildSnapshotJestCommand({
  testRoots: ['/w/.tmp', '/w/theSrc/test/bin'],
  jestPath: '/w/node_modules/.bin/jest',
  args
})

// NB the whole point of acceptNewSnapshots defaulting to false is that a snapshot with no baseline
// FAILS rather than being written and passed. Omitting --ci did not achieve that: jest's ci option
// defaults to ci-info's isCI, which is false on a developer machine, so jest computed
// updateSnapshot: 'new' and jest-image-snapshot wrote the baseline and passed -- exactly the defect,
// on the machine where a new test is most likely to be added.
describe('--ci', () => {
  test('is emitted explicitly when new snapshots are not accepted', () => {
    expect(build({ acceptNewSnapshots: false })).toContain('--ci')
    expect(build({ acceptNewSnapshots: false })).not.toContain('--ci=0')
  })

  test('is disabled explicitly when new snapshots are accepted', () => {
    expect(build({ acceptNewSnapshots: true })).toContain('--ci=0')
  })

  test('never leaves the behaviour to the environment', () => {
    expect(build({})).toContain('--ci')
  })
})

describe('the rest of the command', () => {
  test('quotes each test root', () => {
    expect(build()).toContain('--roots="/w/.tmp" --roots="/w/theSrc/test/bin"')
  })

  test('matches only jest test files', () => {
    expect(build()).toContain('--testMatch="**/*.jest.test.js"')
  })

  test('passes -u only when updating snapshots', () => {
    expect(build({ updateSnapshots: true })).toContain('-u')
    expect(build({ updateSnapshots: false })).not.toContain(' -u')
  })

  test('passes a test name pattern only when given', () => {
    expect(build({ testNamePattern: 'bubble' })).toContain('-t=bubble')
    expect(build({})).not.toContain('-t=')
  })

  test('quotes the jest path, which contains spaces on windows', () => {
    expect(build()).toContain('"/w/node_modules/.bin/jest"')
  })
})
