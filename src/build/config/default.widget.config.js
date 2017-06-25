// Do not modify the values in this file to match a specific widget repo.
// Instead, in the widget repo, add values to the ./build/config/widget.config.js.
// The values in this file are only used if there are not values defined in the widget.config.js file in the widget repo.

module.exports = {
  // widgetName is the name of your widget. Typically match the repo name. This is used throughout the build process.
  widgetName: 'nameYourWidget!',

  // widgetEntryPoint is used by the compileES6 to generate the JS for the inst/html directory.
  // The widgetEntryPoint must point at the JS file where the widget is registered with HTMLWidgets.
  // Browserify will follow all import statements from this file to create a single bundle of all your Javascript
  widgetEntryPoint: 'theSrc/scripts/nameYourWidget.js',

  visualRegressionSuite: {
    applitools: {

      // if disabled, applitools will not take snapshots
      enabled: true, // true|false

      // 'pass' will cause the visualRegression suite to pass even if there are snapshot differences
      // 'fail' will cause the suite to fail at the end of the tests if there are snapshot differences
      onDiff: 'fail', // 'fail'|'pass'

      // width and height of the browser used for testing.
      // Note these values are chosen so the suite can be run on a laptop screen
      width: 1280, // int
      height: 600, // int

      // if the snapshots dont match, applitools will wait X seconds (defaultMatchTimeout)
      // for the page to stabilise before taking a final snapshot
      defaultMatchTimeout: 5,

      // set to info or debug to get more logs from applitools
      logLevel: 'off', // off|info|debug

      // after loading page delay next step by X seconds
      pageLoadDelay: 0 // float >= 0
    },

    // set to true to see the console.log statements from the widget under
    // test and any other logs coming from the chrome browser during the visual regression tests
    browserLogs: false // true|false
  }
}
