// Do not modify the values in this file to match a specific widget repo.
// Instead, in the widget repo, add values to the ./build/config/widget.config.js.
// The values in this file are only used if there are not values defined in the widget.config.js file in the widget repo.

module.exports = {
  // widgetName is the name of your widget. Typically match the repo name. This is used throughout the build process.
  widgetName: 'nameYourWidget!',

  // Task names that this widget repo does not want to run. A disabled task logs "skipping '<name>'" and
  // resolves, so a composite sequence that contains it (build, serve, testVisual, ...) still completes.
  // This replaces the two mechanisms used under gulp: the `exclusions` argument to registerGulpTasks,
  // and re-registering a task as a no-op that logged "skipping". e.g. disabledTasks: ['testSpecs']
  disabledTasks: [],

  // widgetEntryPoint is used by the compileES6 to generate the JS for the inst/html directory.
  // The widgetEntryPoint must be a path to a JS file where the widget is registered with HTMLWidgets.
  // esbuild will follow all import statements from this file to create a single bundle of all your Javascript
  widgetEntryPoint: 'theSrc/scripts/rhtmlYourWidget.js',

  // Passed through to esbuild.build() in src/lib/compileES6.js, deep-merged over the defaults
  // (arrays replace rather than merge). Use this to override target / define / loader / alias /
  // plugins for one widget repo without forking rhtmlBuildUtils.
  // e.g. esbuildOptions: { target: ['es2020'], loader: { '.js': 'jsx' } }
  esbuildOptions: {},

  // widgetfactory is used by the renderContentPage to include your widget code in the JS used for the internal web server.
  // The widgetFactory must be a path to a JS file that exports the widget "factory" function, which returns an object
  // that implements 'renderValue' and 'resize' calls. The widgetFactory file is imported by the renderContentPage.js file
  widgetFactory: 'theSrc/scripts/rhtmlYourWidget.factory.js',

  // the values for branch, env, snapshotDirectory, puppeteer.headless, and puppeteer.slowMo can be overriden on command line when calling rhtml testVisual
  // see docs for details TODO link to docs
  snapshotTesting: {
    branch: 'master', // used to determine which snapshots are used.

    // NB any string is valid: it is just a directory name under snapshotDirectory. The old
    // whitelist allowed only 'local' and 'travis', which is why rhtmlCombinedScatter sets env here
    // rather than passing --env=ci. Travis has not been in use for years.
    env: 'local', // used to determine which snapshots are used.

    // the directory that contains the yaml test plans files.
    // these files define the static snapshots to take during snapshot testing, and also populate the index page of the internal server
    // NB this default changed in 5.0.0 and used to be 'theSrc/test_plans'
    testplanDirectory: 'theSrc/test/snapshotTestDefinitions',

    // the directory that contains jest test files, typically for testing widget resizing, widget rerendering, widget interaction, and widget state management
    interactionTestDirectory: 'theSrc/test/bin',

    // the directory to store all image snapshots taken by jest-image-snapshot while running jest based tests
    snapshotDirectory: 'theSrc/test/snapshots',

    // this value is passed to jest.setTimeout(jestTimeout). Max execution time for each test before the test is failed
    timeout: 30000,

    // delay between when testSnapshots is called and when the selector is tested. May not be needed any more ?
    snapshotDelay: 100,

    // these values are passed directly to puppeteer.launch(puppeteerSettings) and are documented here : https://github.com/puppeteer/puppeteer
    puppeteer: {
      headless: true, // if set to false, show the browser while testing
      slowMo: 0, // delay each step in the browser interaction by X milliseconds
      defaultViewport: {
        width: 1600,
        height: 1600
      }
    },

    // these values are passed directly to require('jest-image-snapshot').configureToMatchImageSnapshot and are documented here : https://github.com/americanexpress/jest-image-snapshot
    pixelmatch: {
      // smaller values -> more sensitive : https://github.com/mapbox/pixelmatch#pixelmatchimg1-img2-output-width-height-options
      customDiffConfig: {
        threshold: 0.1
      },
      failureThreshold: 0.01,
      failureThresholdType: 'percent' // pixel or percent
    },

    // if true, assert that no errors occur; if false, does nothing
    assertNoLogError: true,

    // NB msg is a puppeteer ConsoleMessage. Read it via the public text() accessor: the private
    // _text field this used to read does not exist in modern puppeteer and yields undefined.
    consoleLogHandler: (msg, testName) => console.log(msg.text())
  },

  // these are defaults used when rendering widget in the internal web server only. They do not affect the widget when
  // invoked via R
  internalWebSettings: {

    // define a function that will preprocess the widget state before any equality testing is performed.
    // currently the only use of this is to strip non-deterministic values from state (such as timestamp)
    statePreprocessor: (x) => x,

    // before interacting with a widget under test, we must wait for the widget to load, the "isReadySelector" is a CSS expression, that is used to test if the widget is ready. If the selector returns 1 or more elements, then we can proceed with test.
    isReadySelector: '.rhtmlwidget-outer-svg',

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
  },

  // the directory to search for .jest.test.js files containing spec tests
  specTestingDirectory: 'theSrc/scripts',

  experimentDirectory: 'theSrc/test/experiments'
}
