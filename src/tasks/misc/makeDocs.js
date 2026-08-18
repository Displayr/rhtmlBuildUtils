const shell = require('shelljs')

// NB Rscript, not `r`. littler (`r`) is not available on Windows and is uncommon elsewhere, whereas
// Rscript ships with every R install. The old command also used a bash herestring (<<<) and POSIX
// output redirects, neither of which cmd.exe can parse, so on Windows it could never succeed even with
// R installed. shelljs's own `silent` option replaces the redirects.
const COMMAND = 'Rscript -e "library(devtools); document()"'

module.exports = () => {
  return function (done) {
    // NB required lazily so this module can be loaded without a widget config present, and resolved
    // against basePath rather than the process cwd -- clean.js was changed to do the same, and if only
    // one of them does, running from a subdirectory has clean deleting the right tree while document()
    // regenerates the wrong one.
    const { basePath } = require('../../lib/widgetConfig')

    const result = shell.exec(COMMAND, { silent: true, cwd: basePath })

    // Still non-fatal: R and devtools are genuinely optional for JS-only development, and that is why
    // this task swallows its exit code. What changed is that `clean` no longer deletes man/, so a
    // skipped makeDocs now leaves the committed documentation intact rather than leaving a hole.
    //
    // NB stderr is reported, not just the exit code. The intended case -- R absent -- needs no
    // explanation, but the other one does: with R and devtools installed, document() fails on a
    // roxygen syntax error, and because man/ now survives, the stale .Rd files stay committed. Exit
    // code alone would make that a green build with silently wrong docs and no diagnostic.
    if (result.code !== 0) {
      const stderr = (result.stderr || '').trim()
      console.log(`make docs skipped: '${COMMAND}' exited ${result.code}. ` +
        'This is not fatal -- R and devtools are optional. man/*.Rd is left as committed.' +
        (stderr ? `\n${stderr}` : ''))
    }
    done(null)
  }
}
