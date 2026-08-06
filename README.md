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
 
HTML Widgets that use the `rhtmlBuildUtils` package are ES2015 (or greater) based nodejs projects whose build tasks are run by the `rhtml` binary this package installs. The twofold purpose(s) of these nodejs projects is to produce R HTMLWidget package for cunsumption in R, and provide a development framework including a visual regression suite to make development easier.
 
## Documentation 
 
* readme (this file): usage, installation, and task references
* [internal web server](./docs/internal_web_server.md): how to use the internal server features for widget development
* [test plan syntax](./docs/test_plan_syntax.md): how to write yaml test plan files for the visual regression suite 
* [snapshotting_system](./docs/snapshotting_system.md): how to write visual regression tests for your widget
* [working with displayr](./docs/working_with_displayr.md): notes on the nuances of how displayr interacts with htmlwidgets
* [widget_repo_layout](./docs/widget_repo_layout.md): how to layout your widget repo so it works with rhtmlBuildUtils
* [experiment_framework](./docs/experiment_framework.md): (WIP) experiment framework docs

# Usage in a widget repo

## Installation
 
In your widget repo directory run : 
 
    npm install -D "github:Displayr/rhtmlBuildUtils#9.0.0"

then add an `eslint.config.js` in your widget repo root:

    module.exports = require('rhtmlBuildUtils/eslint.config.base')

and invoke the tasks through the `rhtml` binary from your npm scripts:

    "scripts": {
      "build": "rhtml build",
      "lint": "rhtml lint",
      "start": "rhtml serve",
      "localTest": "rhtml testSpecs && rhtml testVisual --env=local"
    }

There is no gulpfile.js and no registration step: the tasks in [src/tasks](src/tasks) are discovered
automatically and are enumerated [below](#task-reference).

### Upgrading to 9.0.0 from 8.x

Two breaking changes requiring a small edit in the widget repo, plus three changes to what passes and
fails that need no edit but do change results.

**1. gulp is gone.** Delete your `gulpfile.js`, drop `gulp` from your devDependencies, and change every
npm script from `gulp <task>` to `rhtml <task>`. Task names, sequences and command line flags are all
unchanged, so `gulp testVisual --env=local --branch=x` becomes `rhtml testVisual --env=local
--branch=x`. If your repo defines its OWN gulp tasks (rhtmlDonut does), keep gulp as a dependency of
your repo for those and use `rhtml` for the shared ones.

Excluding a task no longer means passing `exclusions` or re-registering it as a no-op. Set
`disabledTasks` in `build/config/widget.config.js` instead:

    disabledTasks: ['testSpecs']

**2. eslint 10 removed `.eslintrc` support entirely.** Replace your `.eslintrc` (and `.eslintignore`,
which flat config also drops) with the one line `eslint.config.js` above; without it `rhtml lint` fails
with "couldn't find an eslint configuration file". The shared config reproduces the previous `standard`
style, so adopting it should not reformat any widget code.

eslint 10 also requires node `^20.19.0 || ^22.13.0 || >=24`.

Build output is unchanged by the gulp removal: the generated `browser/`, `inst/` and `R/` trees are
byte for byte identical to what the gulp pipeline produced, which is deliberate, because the compiled
css feeds the pages the visual regression suite screenshots. `less` is pinned to 3.13.1 (the version
`gulp-less@4` resolved) to keep it that way.

#### Three changes to what passes and fails

These need no edit in your repo, but they will change your results, so sequence a bump deliberately.

**A mismatching snapshot now fails its own test.** Previously the comparison error was swallowed, so a
test whose images did not match reported PASS and the job only went red via jest's aggregate count.
Reading the per-test list therefore led straight to the wrong conclusion. Expect previously-green runs
to surface real per-test failures.

**A snapshot with no baseline now fails.** `acceptNewSnapshots` defaults to `false`. It used to default
to `true`, which appended `--ci=0` to the jest command and made jest write the missing baseline and pass
— so a newly added test could look green forever while never being regression-tested. Pass
`--acceptNewSnapshots` to opt back in when bootstrapping a suite.

**`clean` no longer deletes `man/`.** That directory holds tracked roxygen output which only `makeDocs`
can regenerate, and `makeDocs` swallows its own failure so a missing R install is not fatal — so
`rhtml build` used to silently delete tracked R documentation on every machine without R on PATH,
including CI. `makeDocs` also now calls `Rscript` rather than `r`, which is what makes it capable of
succeeding on Windows at all.

The `--env` flag also no longer has a `local`/`travis` whitelist, so a CI environment can be named after
the system running it instead of being set indirectly through `widget.config.js`.

#### `crypto` is stubbed in the bundle

**If your widget calls anything on node's `crypto`, you must opt back in.** Add to
`build/config/widget.config.js`:

    esbuildOptions: { alias: { crypto: 'crypto-browserify' } }

Without it the first call throws with a message pointing back here, rather than failing silently.
**rhtmlPictographs is the known case** — `CacheService.js` and `SvgDefinitionManager.js` both use
`crypto.createHash`.

Why the default changed: `bignumber.js@2` (rhtmlCombinedScatter, rhtmlLabeledScatter) reaches for crypto
via `require('cry' + 'pto')` inside a `try/catch`, an idiom specifically intended to stop bundlers
resolving it — and browserify duly shipped none of it. esbuild constant-folds the concatenation, so it
resolves, and mapping it to `crypto-browserify` dragged 616 KiB across 180 files (`elliptic`, four copies
of `bn.js`, `asn1.js`, `diffie-hellman`) into rhtmlCombinedScatter's bundle for a code path
(`BigNumber.random`) that nothing calls. See [src/lib/cryptoStub.js](./src/lib/cryptoStub.js).

Two of the main features provided by rhtmlBuildUtils are to start the internal web server and to run the visual regression tests. These topics are covered in these subdocs:

* [internal web server](./docs/internal_web_server.md)
* [visual regression testing](./docs/visual_regression_testing.md)

The `rhtmlBuildUtils` makes many assumptions about the directory structure and naming conventions in the callee widget repo. These are detailed in [widget_repo_layout](./docs/widget_repo_layout.md)

## Customisation

When using the `rhtmlBuildUtils` package in a widget repo, there are two ways to change the behaviour of the tasks: disable a task, or modify a local widget.config.js file.

### Disable a task in a repo

List the task names in `disabledTasks` in `build/config/widget.config.js`. A disabled task logs `skipping '<name>'` and resolves, so any composite sequence that contains it still completes. This replaces both the `exclusions` argument to the old registerGulpTasks and the idiom of re-registering a task as a no-op.

### Modifying widget.config.js

The `rhtmlBuildUtils` package assumes the callee widget repo will contain a config file at \<projectRoot\>/build/config/widget.config.js (example: [rhtmlTemplate/build/config/widget.config.js](https://github.com/Displayr/rhtmlTemplate/blob/master/build/config/widget.config.js)). The descriptions and defaults for all values in the config are defined in the [rhtmlBuildUtils/src/config/default.widget.config.js](https://github.com/Displayr/rhtmlBuildUtils/blob/master/src/config/default.widget.config.js) file.

#### `esbuildOptions`

JS bundling is done with [esbuild](https://esbuild.github.io/) (see `src/lib/compileES6.js`). The `esbuildOptions` key in your widget.config.js is passed through and deep-merged over rhtmlBuildUtils' own esbuild config (arrays, such as `target`, `inject` or `plugins`, are replaced outright rather than merged element-wise).

This is the escape hatch for a widget repo that hits an edge case rhtmlBuildUtils' default esbuild config doesn't handle - for example needing a different `loader`, an extra `alias` for a node builtin, a custom `define`, an esbuild `plugin`, or a different `target` - without having to fork rhtmlBuildUtils or pin back to an older version.

Example:

    esbuildOptions: {
      target: ['es2020'],
      loader: { '.js': 'jsx' }
    }

# task reference

## Top Level Tasks

The top level tasks are those you will likely run as part of the widget build process: 

`rhtml` : this will run the default task: `rhtml build`

`rhtml build` : the following tasks are performed :
 
* delete the directories that contain auto generated code
* run the JS style checker (eslint) and fail the build if the code does not match style
* bundle all the Javascript - including dependencies - into a single file, and transpile the ES6 into ES5 javascript while creating the bundled file
* compile the LESS into CSS and place in the dist directories
* copy all images and other resources into the dist directories
* write R docs

`rhtml serve` : the following tasks are performed :
 
* all of the build tasks above (except test and lint)
* produce a different transpiled version of the code that will load in a local browser
* in addition to the HTML Widget libraries, the local browser session will include a list of examples. This allows the developer to view the effect of their changes
* if this repo contains any experiments, the experiment results will be browsable in the local browser
* `rhtml serve` also starts a `watch` process. Every save to the local file system will rebuild the project and then send a signal to the browser to reload the active page, so that the changes just made to the project are immediately visible.

`rhtml testSpecs` : just run the spec tests

`rhtml testVisual` : start server (i.e. `rhtml serve`), take snapshots for each test definition. This command takes several parameters

* **--acceptNewSnapshots**: accept new snapshots. Defaults to true
* **--branch**: which branch. This determines where to save updated snapshots, and which snapshot set to use for a baseline
* **--env**: which env (local or travis). Always use local unless you are in travis.ci
* **--headless**: show or hide chrome during testing. Default true, which means hide chrome
* **--slowMo**: numeric. add an X millisecond delay between each browser command. Useful for debugging interaction tests 
* **--snapshotDirectory**: snapshots directory. where to read and write snapshots. This defaults to <widgetConfig.snapshotDirectory>/<ENV>/<BRANCH>
* **--testNamePattern**: run subset of tests using this string to filter snapshots. Can be file name or test name
* **--updateSnapshots**: accept all snapshots even if they have changed. Write the new snapshots into the snapshot directory

`rhtml testVisual_s` : just run the visual regression suite (skip the other steps, `rhtml serve` must already be running).

`rhtml reviewBaselines --from <ref> [--to <ref>]` : build a local side-by-side review page for image snapshot baselines, at `.tmp/reviewBaselines/index.html`. GitHub's diff renderer gives up on a few hundred binary files, which is exactly the size of a regenerated baseline set — and reviewing the images is the real gate when accepting new baselines, since a rendering regression accepted there is invisible afterwards. Omit `--to` to compare the working tree against `<ref>`. Baselines reported as *identical* are worth looking at first: one that did not regenerate usually means its test errored before reaching the snapshot.

`rhtml lint` : this runs the eslint style checker on all the javascript files. Our settings are defined in [eslint.config.base.js](./eslint.config.base.js), which your widget repo's `eslint.config.js` re-exports. Which files are checked is decided by the `ignores` in that config rather than by this task, because eslint 10 has no `.eslintignore`. To run with auto fix run `rhtml lint --fix`. Note that this is also run as a git prepush hook so you will not be able to push code to git unless it passes the style checks. 

# Developing / Contributing

1. Most important: consider this repo is used by multiple widgets. Ensure your changes are generic, can be overriden in the widget repos if necessary, and do not break the build steps of other widget repos.

2. Also important: every merge to master should include an increase in the version of the rhtmlBuildUtils repo. Steps to manage this are included below.

The **[rhtmlTemplate](https://github.com/Displayr/rhtmlTemplate)** is a minimal implmentation of a htmlwidget, and is a good test bed to ensure changes to rhtmlBuildUtils work. Any enhancements to rhtmlBuildUtils should be reflected in rhtmlTemplate.

3. we use npm's [`overrides`](https://docs.npmjs.com/cli/v10/configuring-npm/package-json#overrides) field to force some transitive dependencies to secure versions. npm applies these during dependency resolution, so a plain `npm install` is enough - there is no extra command to remember before pushing. (This replaces the `resolutions` field and the `npm-force-resolutions` package, which patched `package-lock.json` after the fact and no longer works reliably with modern lockfiles.)

    Note that npm only honours `overrides` from the **top level** project - an `overrides` block inside a dependency's `package.json` is ignored. So the block in this repo protects this repo's own dev tree only; each consuming widget repo needs its own copy to protect its tree.  

## Installation to develop/contribute

1. (prerequisite) : nodejs >= 12.9 (see the `Prequisite Installation Help` section below for install help)
1. (prerequisite) : npm >= 6.10 (comes packaged with nodejs)
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
