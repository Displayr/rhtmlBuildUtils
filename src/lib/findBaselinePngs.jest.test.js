const fs = require('fs-extra')
const os = require('os')
const path = require('path')

const findBaselinePngs = require('./findBaselinePngs')

let root

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'baselines-'))
  fs.outputFileSync(path.join(root, 'testPlans/bubbleplots/one-snap.png'), 'png')
  fs.outputFileSync(path.join(root, 'stateInteractions/two-snap.png'), 'png')
})

afterEach(() => fs.removeSync(root))

test('lists baselines as posix relative paths', () => {
  expect(findBaselinePngs(root).sort()).toEqual([
    'stateInteractions/two-snap.png',
    'testPlans/bubbleplots/one-snap.png'
  ])
})

// NB these two directories live inside the snapshot tree but hold diagnostics, not baselines. They
// exist only after a failing run -- and never at the ref being compared against -- so counting them
// classifies every diff image as a new baseline, burying the real ones.
test('skips jest-image-snapshot diff output', () => {
  fs.outputFileSync(path.join(root, 'testPlans/bubbleplots/__diff_output__/one-snap-diff.png'), 'png')

  expect(findBaselinePngs(root)).not.toContain('testPlans/bubbleplots/__diff_output__/one-snap-diff.png')
})

test('skips the new_snapshots written by a failing run', () => {
  fs.outputFileSync(path.join(root, 'new_snapshots/three-snap.png'), 'png')

  expect(findBaselinePngs(root)).not.toContain('new_snapshots/three-snap.png')
})

test('skips them at any depth', () => {
  fs.outputFileSync(path.join(root, 'a/b/__diff_output__/deep-snap.png'), 'png')
  fs.outputFileSync(path.join(root, 'a/b/new_snapshots/deep-snap.png'), 'png')

  expect(findBaselinePngs(root).sort()).toEqual([
    'stateInteractions/two-snap.png',
    'testPlans/bubbleplots/one-snap.png'
  ])
})

test('ignores non png files', () => {
  fs.outputFileSync(path.join(root, 'testPlans/notes.txt'), 'text')

  expect(findBaselinePngs(root)).not.toContain('testPlans/notes.txt')
})

test('returns nothing for a tree that does not exist', () => {
  expect(findBaselinePngs(path.join(root, 'nope'))).toEqual([])
})
