const yargs = require('yargs')

module.exports = () => {
  yargs
    .option('name', {
      alias: 'n',
      describe: 'name of experiment',
      string: true,
      required: true
    })
    .option('iteration', {
      alias: 'i',
      describe: 'which experiment iteration to run',
      string: true
    })
    .option('baseline', {
      alias: 'b',
      describe: 'run the baseline',
      boolean: true,
      default: true,
      required: false
    })
  return yargs.parse()
}
