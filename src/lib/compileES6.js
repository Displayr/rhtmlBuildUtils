const _ = require('lodash')
const colors = require('ansi-colors')
const log = require('fancy-log')
const path = require('path')
const { esbuildOptions } = require('./widgetConfig')

// lodash merge is deep, which is what we want for `define`, but we want a consumer-supplied
// array (target, inject, plugins) to replace ours outright, not merge element-wise.
const replaceArrays = (objValue, srcValue) => (Array.isArray(srcValue) ? srcValue : undefined)

module.exports = ({ entryPointFile, destinationDirectory, minify = false, callback } = {}) => {
  // Required lazily, not at module top-level: src/index.js requires this file eagerly to expose
  // the public lib.compileES6 export, so a top-level require would load esbuild's native binary
  // any time a consumer merely imports the rhtmlBuildUtils package — including inside a jest
  // jsdom worker for an unrelated export. esbuild's internal `Buffer instanceof Uint8Array`
  // startup check fails inside that jsdom realm ("your JavaScript environment is broken"),
  // breaking test suites that never call compileES6 at all. Lazy require confines the load to
  // the real Node process that actually invokes bundling.
  const esbuild = require('esbuild')
  log(`bundling ${entryPointFile}`)

  const options = _.mergeWith({
    entryPoints: [entryPointFile],
    outdir: destinationDirectory,
    bundle: true,
    write: true,
    sourcemap: true, // 'linked': writes the .map AND appends //# sourceMappingURL
    minify,
    target: ['es2017'], // see Context: es5 hard-errors on async/await
    platform: 'browser',
    format: 'iife',
    logLevel: 'silent', // we surface errors and warnings ourselves, below
    inject: [path.join(__dirname, 'esbuildPolyfillShim.js')],
    alias: { crypto: 'crypto-browserify' }, // browserify shimmed node builtins implicitly
    define: {
      'process.env.NODE_ENV': JSON.stringify(minify ? 'production' : 'development'),
      global: 'window'
    }
  }, esbuildOptions, replaceArrays)

  return esbuild.build(options)
    .then((result) => {
      result.warnings.forEach((warning) => log(colors.yellow('[Warning]'), warning.text))
      if (callback) callback()
    })
    .catch((err) => {
      log(colors.red('[Error]'), err.toString())
      if (callback) { callback(err) } else { throw err }
    })
}
