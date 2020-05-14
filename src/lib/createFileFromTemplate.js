const fs = require('fs-extra')
const mustache = require('mustache')
const path = require('path')

module.exports = function ({ templateFile, templateVariables, destinationFile }) {
  const destinationDirectory = path.dirname(destinationFile)
  fs.mkdirsSync(destinationDirectory)

  const templateContent = fs.readFileSync(templateFile, 'utf8')
  const output = mustache.render(templateContent, templateVariables)
  fs.writeFileSync(destinationFile, output, 'utf8')
}
