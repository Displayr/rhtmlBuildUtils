const shell = require('shelljs')

// NB Rscript, not `r`. littler (`r`) is not available on Windows and is uncommon elsewhere, whereas
// Rscript ships with every R install. The old command also used a bash herestring (<<<) and POSIX
// output redirects, neither of which cmd.exe can parse, so on Windows it could never succeed even with
// R installed. shelljs's own `silent` option replaces the redirects.
const COMMAND = 'Rscript -e "library(devtools); document()"'

module.exports = () => {
  return function (done) {
    const exitCode = shell.exec(COMMAND, { silent: true }).code

    // Still non-fatal: R and devtools are genuinely optional for JS-only development, and that is why
    // this task swallows its exit code. What changed is that `clean` no longer deletes man/, so a
    // skipped makeDocs now leaves the committed documentation intact rather than leaving a hole.
    if (exitCode !== 0) {
      console.log(`make docs skipped: '${COMMAND}' exited ${exitCode}. ` +
        'This is not fatal -- R and devtools are optional. man/*.Rd is left as committed.')
    }
    done(null)
  }
}
