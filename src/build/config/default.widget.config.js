// Do not modify the values in this file to match a specific widget repo.
// Instead, in the widget repo, add values to the ./build/config/widget.config.js.
// The values in this file are only used if there are not values defined in the widget.config.js file in the widget repo.

module.exports = {
  // widgetName is the name of your widget. Typically match the repo name. This is used throughout the build process.
  widgetName: 'nameYourWidget!',

  // widgetEntryPoint is used by the compileES6 to generate the JS for the inst/html directory.
  // The widgetEntryPoint must be a path to a JS file where the widget is registered with HTMLWidgets.
  // Browserify will follow all import statements from this file to create a single bundle of all your Javascript
  widgetEntryPoint: 'theSrc/scripts/rhtmlYourWidget.js',

  // widgetfactory is used by the renderContentPage to include your widget code in the JS used for the internal web server.
  // The widgetFactory must be a path to a JS file that exports the widget "factory" function, which returns an object
  // that implements 'renderValue' and 'resize' calls. The widgetFactory file is imported by the renderContentPage.js file
  widgetFactory: 'theSrc/scripts/rhtmlYourWidget.factory.js',

  snapshotTesting: {
    // the directory that contains the yaml test plans files.
    // these files define the static snapshots to take during snapshot testing, and also populate the index page of the internal server
    // testplanDirectory: 'theSrc/test/snapshotTest', // new default value cant use yet (it would be a breaking change)
    testplanDirectory: 'theSrc/test_plans', // old default value, must maintain until next breaking update (i.e. 5.0.0)

    // the directory to store all image snapshots taken by jest-image-snapshot while running jest based tests
    snapshotDirectory: 'theSrc/test/snapshots'
  },

  visualRegressionSuite: {

    // before interacting with a widget under test, we must wait for the widget to load, the "isReadySelector" is a CSS expression, that is used to test if the widget is ready. If the selector returns 1 or more elements, then we can proceed with test.
    isReadySelector: '.rhtmlwidget-outer-svg',

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

      // after loading page delay next step by X seconds. Necessary in CI environment
      pageLoadDelay: 0 // float >= 0
    },

    // set to true to see the console.log statements from the widget under
    // test and any other logs coming from the chrome browser during the visual regression tests
    browserLogs: false, // true|false

    // define a function that will preprocess the widget state before any equality testing is performed.
    // currently the only use of this is to strip non-deterministic values from state (such as timestamp)
    statePreprocessor: (x) => x
  },

  // these are defaults used when rendering widget in the internal web server only. They do not affect the widget when
  // invoked via R
  internalWebSettings: {

    // in renderContentPage there is an widget-container div and an widget-div. If 'includeDimensionsOnWidgetDiv' is true then the width and height of the widget-div div is set to the width x height. If false it is left to inherit from the parent.
    // Some widgets require inherit, some require explicit width x height
    includeDimensionsOnWidgetDiv: false,

    // default width of a widget
    default_width: 200,

    // default width of a widget
    default_height: 200,

    // by default should we draw a border around each widget
    default_border: false,

    // include these css files when rendering widgets via renderExample.html
    // NB css in theSrc/styles can be accessed via entries in the CSS array starting with "/styles/x.css"
    css: []
  }
}
