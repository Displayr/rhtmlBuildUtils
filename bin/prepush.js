const shell = require('shelljs')

runLint()

function runLint () {
  process.exit(shell.exec('node ./node_modules/eslint/bin/eslint.js .').code)
}
