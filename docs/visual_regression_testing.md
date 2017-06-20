# Visual Regression Testing

## Quick Reference: how to use and extend it

* to run the visual regression suite : `gulp testVisual`
* to run the visual regression suite if the web driver binaries are already installed and `gulp serve` is already running: `gulp testVisual_s`
* to run the visual regression suite on a subset of the scenarios : `gulp testVisual_s --tags=<TAG>`. Only scenarios matching the tag will be run.
* to disable applitools snapshots during a visual regression run : `gulp testVisual_s --applitools.enabled=false`
* to ignore applitools snapshots (i.e., tests pass even if snapshots are diff) during a visual regression run : `gulp testVisual_s --applitools.onDiff=pass`
* to see browser log messages during a visual regression run : `gulp testVisual_s --browserLogs=true`
* to see applitools debug logging during a visual regression run : `gulp testVisual_s --applitools.logLevel=debug`
* to view the visual regression results: login to [https://applitools.com] and look at your new tests.
* to add a new visual regression test that does not require interaction with the widget:
    * create a new file in `<projectRoot>/theSrc/internal_www/content` using the [content_template](https://github.com/Displayr/rhtmlTemplate/blob/master/theSrc/internal_www/content/content_template.html), or add an example to an existing content file IF IT FITS (dont mix concerns in your files)
    * add a `<div snapshot-name="....">` element that wraps your example(s)
* to add a new visual regression test that does require interaction with the widget:
    * create a new feature file in `<projectRoot>/bdd/features/` or add scenarios to an existing file, then follow the pattern of reusing existing steps or defining new steps
* where does the applitools key go: place it in a file called `<projectRoot>/.keys/applitools.key` no formatting, no newlines or spaces, no json, just the key.
* where is the auto generated snapshots.feature file ? `<projectRoot>/.tmp/snapshots.feature`
* What is the applitools username and password? Ask someone who knows.

## Pre-defined Steps :

The following steps are defined by the rhtmlBuildUtils repo:

**Loading steps:**

    'Given I am viewing "<config>" with dimensions WWWxHHH'
    'Given I am viewing "<config>" with state "<state>" and dimensions WWWxHHH'
    'Given I am viewing "<config>" with dimensions WWWxHHH and rerender controls' 
    'Given I am viewing "<config>" with state "<state>" and dimensions WWWxHHH and rerender controls' 

Loading steps will load a widget config, with optional state, and a given width and height. The <config> supplied must match the file system such that there is a file in the widget repo at `./theSrc/internal_www/data/<config>/config.json` and the optional <state> must match the file system such that this file exists : `./theSrc/internal_www/data/<config>/<state>.json`. These steps actually load the URL `http://localhost:9000/renderExample.html` , which is documented in more details [here](./internal_web_server.md).
 
If `with/and rerender controls` is included then the rerender controls will be added, allowing the tests to test widget rerendering.

**Rerender steps:**

    'Given I rerender with config "<config>"'

This will cause the widgetRenderValue to be called again with a config. The same config or a new config can be provided. Same rules as load steps apply for determining the config location on disk.

**Sleep steps:**

    'Then Sleep XXX'
    'Then Sleep XXX milliseconds'

**Snapshot Steps:**

    'Then the "<snapshot_name>" snapshot matches the baseline'
    'When I take all the snapshots on the page "<path_to_page>' (do not use / automation only)

This step causes the suite to use applitools to take a snapshot of the current state and call it "<snapshot_name>". If the named snapshot does not match the saved snapshot in the applitools DB then the test will fail (unless --applitools.onDiff is set to 'pass'). If this is a new snapshot then the test will pass.

**User State Steps:**

    'Then the final state callback should match "<state>"'
    
This step will compare the last stateChangeCallback with the state saved in `./theSrc/internal_www/data/<config>/<state>.json`. If the two state objects do not match then the test will fail. 

## The Visual Regression Testing Stack

Our Protractor + Cucumber + Applitools visual regression suite is composed of a series of technologies. 

* At the core you have [selenium](http://docs.seleniumhq.org/) which provides a programmatic way to interact with a real browser. 
* On top of that we have [webdriverJS](https://github.com/SeleniumHQ/selenium/wiki/WebDriverJs), which is a node.js wrapper on top of selenium so that we can write selenium code in nodejs. 
* On top of that we have [protractor](http://www.protractortest.org/), which provides some angular.js specific features and some other niceities. While protractor is not strictly necessary for this project, and an alternative like webdriver.io or other could be considered, the author of the module was familiar with protractor and protractor is well packaged such that the barrier to use was minimal, thus it was chosen. Further, protractor allows the use of cucumber and applitools 
* To provide a user friendly test language, we are using the [cucumber](https://cucumber.io/) test framework so that we can write true [Given Then When / Specification By Example testing](https://martinfowler.com/bliki/GivenWhenThen.html).
* To perform snapshot baselining, we are using [applitools](http://applitools.com).

From a tester perspective, you will need to write new Cucumber scenarios in a feature file. Cucumber is made up of:
 
* `Feature files` containing `Scenarios`, each of which is one or more `steps`
* `Step Definition` files containing ... step definitions, and
* `Page Objects`, which abstract the web content under test (in our case our widget)

### Protractor + Cucumber Example 

It's easiest to use an example from the [rhtmlTemplate](https://github.com/Displayr/rhtmlTemplate) repo. Here's a trivial feature file that clicks the widget:

```
Feature: A Demo feature file
  User should be able to click on the colored squares to select them

  Scenario: User can click the blue square
    Given I am viewing "default_template_widget" with dimensions 400x400
    When I click the "blue" square
    Then the "blue" square should be selected

  Scenario: User can click the red square
    Given I am viewing "default_template_widget" with dimensions 400x400
    When I click the "red" square
    Then the "red" square should be selected
```

Some notes on the above:

* There is one `Feature` per .feature file and the feature text can be free text to descibe what is under test in the file
* There is one or more `Scenario` per file and the text to the right of the `Scenario:` is a description of the scenario.
* The rest of the lines are `Steps`. The step must start with `Given` / YOU ARE HERE ! 
* When cucumber examines the line `When I click the "blue" square`, it will look through all its step definitions for a matching step definition. If it finds one then it will execute the code. In our case there is a matching step definition in the file [widgetInteractions.steps.js](https://github.com/Displayr/rhtmlTemplate/blob/master/bdd/steps/widgetInteraction.steps.js):

```
  this.When(/^I click the "([^"]+)" square$/, function (squareName) {
    return this.context.templatePageObject.selectSquare(squareName);
  });
```

This step definition extracts the string 'blue' from the `Step` in the feature file and then calls widget.selectSquare('blue'). widget in this case is a Page Object that abstracts interaction with the browser. It is defined here : '[template.page.js](https://github.com/Displayr/rhtmlTemplate/blob/master/bdd/pageObjects/template.page.js)'. In that file the definition of selectSquare is :

```
  selectSquare(squareName) {
    return element(by.css(`.text.${squareName}`)).click();
  }
```

You can see that the above uses a CSS selector to identify an area in the browser and then click it! `element` is provided by protractor and is documented [here](http://www.protractortest.org/#/api). 

### Applitools Example

Again its easiest to use an example. Consider the scenario below:

```
  Scenario: User state is saved on next reload
    Given I am viewing "default_template_widget" with state "blue_square_selected" and dimensions 400x400
    Then the "default_template_widget_blue_square_selected" snapshot matches the baseline
```
 
The first `Step` tell protractor to load renderExample.html with a specific config and userState file. The second `Step` tells protractor to call applitools and take a snapshot of the widget called "default_template_widget_blue_square_selected" and compare it to the baseline version of "default_template_widget_blue_square_selected".
 
Some notes on Applitools:
 
* To see the snapshot comparison we must go to the applitools website : [http://applitools.com](http://applitools.com)
* Presently, if the snapshot does not match the protractor tests will still pass. This is a work in progress. So you need to check the website even if the tests pass !
 
## Taking all the snapshots in the content area

The visual snapshots in the content area are taken using similar steps to what is outlined above, however the process is automated such that no new test code is required when we add new content. The gulp task `buildSnapshotsFeatureFile` generates the `.tmp/snapshots.feature` file. This file contains one scenario for each content page containing a snapshot. Each scenario contains a step that cucumber interprets that causes protractor to load the page and take all the snapshots.