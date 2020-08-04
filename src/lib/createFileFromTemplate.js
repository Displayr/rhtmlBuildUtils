const fs = require('fs-extra')
const mustache = require('mustache')
const path = require('path')


module.exports = function ({ templateFile, templateVariables, destinationFile }) {
  console.log(`createFileFromTemplate 1`)
  console.log(JSON.stringify({ templateFile, templateVariables, destinationFile }, {}, 2))

  const destinationDirectory = path.dirname(destinationFile)
  console.log(`createFileFromTemplate 2 destinationDirectory:`, destinationDirectory)
  fs.mkdirsSync(destinationDirectory)

  const templateContent = fs.readFileSync(templateFile, 'utf8')
  const output = mustache.render(templateContent, templateVariables)
  fs.writeFileSync(destinationFile, output, 'utf8')
  console.log(`createFileFromTemplate 3 done`)
}
