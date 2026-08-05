const fs = require('fs-extra')
const path = require('path')
const { basePath } = require('../../lib/widgetConfig')

// NB 'man' is deliberately NOT in this list. It holds roxygen output (man/*.Rd), which is TRACKED and
// which only the makeDocs task can regenerate -- and makeDocs shells out to R, then swallows its own
// failure so that a missing R install is not fatal. Deleting man/ here therefore destroyed tracked R
// documentation on every machine without R on PATH (every Windows dev, every CI runner) and left it
// destroyed, printing a "make docs failed" line and carrying on.
//
// The other entries are safe to delete because each is rebuilt by a step that cannot silently no-op:
// 'browser' and '.tmp' are build scratch, 'inst' comes from compileWidgetEntryPoint plus core, and 'R'
// from core's copy task.
const LOCATIONS_TO_DELETE = ['browser', 'inst', 'R', '.tmp']

module.exports = () => {
  return async function () {
    // NB resolved against basePath rather than the process cwd, matching every other task. Under gulp
    // these were cwd-relative and happened to work because gulp was always invoked from the widget root.
    await Promise.all(LOCATIONS_TO_DELETE.map(location => fs.remove(path.join(basePath, location))))
  }
}
