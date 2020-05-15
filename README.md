# rhtmlBuildUtils

This repo provides an opinionated framework for building and testing [R htmlwidgets](http://www.htmlwidgets.org/). 

One of the objectives of this framework is to present a clear seperation between the JS and R code, so that all stages of development short of verification can be done without any interaction with R.

Example widgets that use this framework:
 
 * **[rhtmlTemplate](https://github.com/Displayr/rhtmlTemplate)**: a simple widget for demonstration and testing
 * **[rhtmlEchoLifecycle](https://github.com/Displayr/rhtmlEchoLifecycle)**: a widget for debugging the htmlwidget wrapper and displayr
 * **[rhtmlPictographs](https://github.com/Displayr/rhtmlPictographs)**: a widget for generating simple infographics
 * **[rhtmlLabeledScatter](https://github.com/Displayr/rhtmlLabeledScatter)**: a widget for generating scatter plots, bubble plots, and trend graphs
 * **[rhtmlHeatmap](https://github.com/Displayr/rhtmlHeatmap)**: a widget for generating heatmaps (wraps d3heatmap)
 * **[rhtmlDonut](https://github.com/Displayr/rhtmlDonut)**: a widget for generating donuts (wraps d3heatmap)
 * **[rhtmlPalmTrees](https://github.com/Displayr/rhtmlPalmTrees)**: a widget for displaying palm tree statistical visualisations (good for sentiment analysis)
 * **[rhtmlMoonPlot](https://github.com/Displayr/rhtmlMoonPlot)**: a widget for displaying a moon plot to visualise results of correspondance analysis
 * **[rhtmlSankeyTree](https://github.com/Displayr/rhtmlSankeyTree)**: a widget for displaying sankey diagrams
 
HTML Widgets that use the `rhtmlBuildUtils` package are ES2015 (or greater) based nodejs projects that use gulp as a task manager. The twofold purpose(s) of these nodejs projects is to produce R HTMLWidget package for cunsumption in R, and provide a development framework including a visual regression suite to make development easier.
 
## Documentation 
 
* readme (this file): usage, installation, and task references
* [internal web server](./docs/internal_web_server.md): how to use the internal server features for widget development
* [test plan syntax](./docs/test_plan_syntax.md): how to write yaml test plan files for the visual regression suite 
* [snapshotting_system](./docs/snapshotting_system.md): how to write visual regression tests for your widget
* [working with displayr](./docs/working_with_displayr.md): notes on the nuances of how displayr interacts with htmlwidgets
* [widget_repo_layout](./docs/widget_repo_layout.md): how to layout your widget repo so it works with rhtmlBuildUtils

# Usage in a widget repo

## Installation
 
In your widget repo directory run : 
 
    npm install --only=dev Displayr/rhtmlBuildUtils

then in your project gulpfile.js:

    const gulp = require('gulp')
    const rhtmlBuildUtils = require('rhtmlBuildUtils')
    
    const dontRegisterTheseTasks = []
    rhtmlBuildUtils.registerGulpTasks({ 
      gulp: gulp, 
      exclusions: dontRegisterTheseTasks 
    })

TODO: UPDATE DOC LINE : file path incorect
By calling registerGulpTasks you will add all the tasks defined in [src/tasks](src/tasks) to your project. These tasks are enumerated [below](#gulp-task-reference).

Two of the main features provided by rhtmlBuildUtils are to start the internal web server and to run the visual regression tests. These topics are covered in these subdocs:

* [internal web server](./docs/internal_web_server.md)
* [visual regression testing](./docs/visual_regression_testing.md)

The `rhtmlBuildUtils` makes many assumptions about the directory structure and naming conventions in the callee widget repo. These are detailed in [widget_repo_layout](./docs/widget_repo_layout.md)

## Customisation

When using the `rhtmlBuildUtils` package in a widget repo, there are two ways to change the behaviour of the gulp tasks: to exclude a task then define it yourself in the repo, or to modify a local widget.config.js file.

### Override a task in a repo

When calling rhtmlBuildUtils.registerGulpTasks, pass an exclusions array with a list of tasks that you do not want rhtmlBuildUtils to define. Then add them to your gulp config following standard gulp techniques; see [http://gulpjs.com/](http://gulpjs.com/).

### Modifying widget.config.js

The `rhtmlBuildUtils` package assumes the callee widget repo will contain a config file at \<projectRoot\>/build/config/widget.config.js (example: [rhtmlTemplate/build/config/widget.config.js](https://github.com/Displayr/rhtmlTemplate/blob/master/build/config/widget.config.js)). The descriptions and defaults for all values in the config are defined in the [rhtmlBuildUtils/build/config/default.widget.config.js](https://github.com/Displayr/rhtmlBuildUtils/blob/master/src/build/config/default.widget.config.js) file.

# gulp task reference

## Top Level Tasks

The top level tasks are those you will likely run as part of the widget build process: 

`gulp` : this will run the default task: `gulp build`

`gulp build` : the following tasks are performed :
 
* delete the directories that contain auto generated code
* run the JS style checker (eslint) and fail the build if the code does not match style
* bundle all the Javascript - including dependencies - into a single file, and transpile the ES6 into ES5 javascript while creating the bundled file
* compile the LESS into CSS and place in the dist directories
* copy all images and other resources into the dist directories
* write R docs

`gulp serve` : the following tasks are performed :
 
* all of the build tasks above (except test and lint)
* produce a different transpiled version of the code that will load in a local browser
* in addition to the HTML Widget libraries, the local browser session will include a list of examples. This allows the developer to view the effect of their changes
* if this repo contains any experiments, the experiment results will be browsable in the local browser
* gulp serve also starts a `watch` process. Every save to the local file system will rebuild the project and then send a signal to the browser to reload the active page, so that the changes just made to the project are immediately visible.

`gulp testSpecs` : just run the spec tests

`gulp testVisual` : start server (`i.e., gulp serve`), take snapshots for each test definition. This command takes several parameters

* (--acceptNewSnapshots) accept new snapshots. Defaults to true
* (--branch) which branch. This determines where to save updated snapshots, and which snapshot set to use for a baseline
* (--env) which env (local or travis). Always use local unless you are in travis.ci
* (--headless) show or hide chrome during testing. Default true, which means hide chrome
* (--log) echo browser log output. Not currently implemented
* (--slowMo) numeriuc. add an X millisecond delay between each browser command. Useful for debugging interaction tests 
* (--snapshotDirectory) snapshots directory. where to read and write snapshots. This defaults to <widgetConfig.snapshotDirectory>/<ENV>/<BRANCH>
* (--testNamePattern -t) run subset of tests using this string to filter snapshots. Can be file name or test name
* (--updateSnapshots -u) accept all snapshots even if they have changed. Write the new snapshots into the snapshot directory

`gulp testVisual_s` : just run the visual regression suite (skip the other steps, `gulp serve` must already be running).

`gulp lint` : this runs the eslint style checker on all the javascript files. Our settings are defined in `.eslintrc`. To run with auto fix run `gulp lint --fix`. Note that this is also run as a git prepush hook so you will not be able to push code to git unless it passes the style checks. 

# Developing / Contributing

Most important: consider this repo is used by multiple widgets. Ensure your changes are generic, can be overriden in the widget repos if necessary, and do not break the build steps of other widget repos.

Also important: every merge to master should include an increase in the version of the rhtmlBuildUtils repo. Steps to manage this are included below.

The **[rhtmlTemplate](https://github.com/Displayr/rhtmlTemplate)** is a minimal implmentation of a htmlwidget, and is a good test bed to ensure changes to rhtmlBuildUtils work. Any enhancements to rhtmlBuildUtils should be reflected in rhtmlTemplate.

## Installation to develop/contribute

1. (prerequisite) : nodejs >= 8.15.1 (see the `Prequisite Installation Help` section below for install help)
1. (prerequisite) : npm >= 6.4.1 (comes packaged with nodejs)
1. `git clone git@github.com:Displayr/rhtmlBuildUtils.git`
1. `cd rhtmlBuildUtils`
1. `npm install`
    1. `npm` is noisy and will print several warnings about `UNMET` and `DEPRECATED`. Ignore these and only make note of errors. If it fails, try running it again.

## Using npm link locally to aid development

A common update scenario is that you are working on a specific widget and need to make a change to rhtmlBuildUtils. To enable this scenario you can use [npm link](https://docs.npmjs.com/cli/link) locally. 

By doing this your local widget repo will use your local rhtmlBuildUtils repo, instead of the version of rhtmlBuildUtils that is installed in the `node_modules` directory of the widget repo.
 
 Examples steps (assuming you are working on rhtmlTemplate):
 
 1. cd rhtmlBuildUtils
 1. npm link
 1. cd ../rhtmlTemplate
 1. npm link rhtmlBuildUtils
 
Do not forget to unlink when you are done, and after pushing the rhtmlBuildUtils code and bumping the release version, also bumping the rhtmlBuildUtils version in the package.json of the widget repo.
 
## Increment the release version on every update
  
In package.json, increase the version before merging your update to master. Once merged, create a new 'release' (a git tag) to match the version by using the git command line tool or the github UI.

## Prerequisite Installation Help

### Install nodejs on OSX

1. Install brew by following instructions here : http://brew.sh/
1. Install nvm (node version manager) by running `brew install nvm`
1. Install node by running `nvm install 6.10` on the terminal

### Install nodejs on Windows

1. Setup nodist. https://github.com/marcelklehr/nodist and find the link to the official installer.
1. Open the command prompt. Type: `nodist v6.10`
1. Type `node -v` and verify the version is correct
