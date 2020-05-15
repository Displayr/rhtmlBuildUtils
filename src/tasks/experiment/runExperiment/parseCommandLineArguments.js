const yargs = require('yargs')

module.exports = () => {
  yargs.option('name', {
    alias: 'n',
    describe: 'name of experiment',
    string: true,
    required: true
  })
  return yargs.parse()
}
