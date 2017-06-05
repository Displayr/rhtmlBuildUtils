const appRootDir = require('app-root-dir').get()
const babelify = require('babelify')

module.exports = function (config) {
  config.set({
    browsers: ['Chrome'],
    basePath: appRootDir,
    files: [
      'theSrc/scripts/**/*.spec.js'
    ],

    frameworks: ['browserify', 'mocha', 'sinon-chai', 'chai-dom', 'chai-as-promised', 'chai', 'sinon'],

    preprocessors: {
      './theSrc/scripts/**/*.spec.js': ['browserify']
    },

    browserify: {
      debug: true,
      transform: [[babelify, {
        presets: [require('babel-preset-es2015-ie')],
        plugins: [
          require('babel-plugin-transform-object-assign'),
          require('babel-plugin-transform-exponentiation-operator'),
          require('babel-plugin-array-includes').default
        ]
      }]]
    }
  })
}
