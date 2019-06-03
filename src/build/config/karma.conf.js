const appRootDir = require('app-root-dir').get()
const babelify = require('babelify')

module.exports = function (config) {
  config.set({
    browsers: ['Chrome'],
    basePath: appRootDir,
    files: [
      'theSrc/scripts/**/*.spec.js'
    ],

    frameworks: ['browserify', 'mocha', 'sinon-chai', 'chai-dom', 'chai', 'sinon'],

    plugins: ['karma-browserify', 'karma-mocha', 'karma-sinon-chai', 'karma-chai-dom', 'karma-chai', 'karma-sinon', 'karma-chrome-launcher'],

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
