# Overview

It is worth reiterating in big bold letters that this documents the expected layout of rerpos that use rhtmlBuildUtils, (e.g., [rhtmlTemplate](https://github.com/Displayr/rhtmlTemplate)). This does not apply to this repo (i.e., rhtmlBuildUtils).

When working in a widget repo there are two important things to remember:

1. The last thing you do before committing is run `gulp build` to ensure all the autogenerated files are up to date.
1. (With some exceptions) **ONLY EDIT THINGS IN these directories: `theSrc`, `docs`, `build`, and `bdd` !!** Many of the other files are auto generated based on the contents of `theSrc`. As an example, if you edit `R/rhtmlTemplate.R` and then run `gulp build` your changes will be DELETED FOREVER!, because `R/rhtmlTemplate.R` is just a copy of `theSrc/R/htmlwidget.R`.

This document focuses on file layout and naming expectations, while providing a brief overview of what each file should do. There are two relevant docs in the `rhtmlTemplate` repo which get into details about how the widget JS actually works, and how one would create a new HtmlWidget repo using rhtmlTemplate as an example:
 
* [How The Code Works](https://github.com/Displayr/rhtmlTemplate/blob/master/docs/how_the_code_works.md)
* [Extending The Template](https://github.com/Displayr/rhtmlTemplate/blob/master/docs/extending_the_template.md)

# HtmlWidget Minimum Structure

First a primer on R packages, specifically R htmlwidget packages. More detailed info can be found on the html widgets develop intro site : [http://www.htmlwidgets.org/develop_intro.html](http://www.htmlwidgets.org/develop_intro.html). 

The following is a breakdown of the minimum set of files to create a HTMLWidget called Foo:

* **LICENSE** - License file
* **DESCRIPTION** - a R package manifest containing package name, version, author, etc.
* **NAMESPACE** - R import and export declarations
* **R/FOO.R** - the R code that defines the R API for the HTMLWidget
* **inst/htmlwidgets/FOO.js** - the javascript definition of the html widget
* **inst/htmlwidgets/FOO.yaml** - a manifest file that defines the javascript and css dependencies of the htmlwidget
* **inst/htmlwidgets/lib/DEPENDENCY.js** - a JS dependency, think jquery or d3. These must be listed in the YAML file.
* **inst/htmlwidgets/lib/STYLE.css** - CSS dependency

Given we use npm and package.json to manage our dependencies, and given we have a browser/ directory that supports the `gulp serve` workflow, maintaining our code in the structure outlined above is not really a good option. Instead, we choose to maintain all the source code in a directory called `theSrc` (if it was called `src` then the HTMLWidget package will treat it as binaries ??) and use a gulp build process to automatically generate the R htmlwidget file structure above from the source in `theSrc`.

Even though the original/gold/working/active copy of all the src is in a folder called `theSrc`, we still check all the `compiled` versions in inst into github. Why? This allows the HTML Widgets to be installable from R via a single `devtools::install_github` command.

_**So lets recap a really important point: only edit files in the `theSrc`, `docs`, `build`' and `bdd` directories.**_. All files in the `R/`, `inst/`, and `man/` directories are autogenerated by the `gulp build` / `gulp serve` task using input from the `theSrc` directory. If you edit in `inst` and then run `gulp build` it will wipe out all your hard work, and your peers will laugh at your misfortune !

# HtmlWidget Repo Files and Their Roles

There are lots of files. This is what they do:

> Remember, this is the layout of an actual widget repo, not _this_ repo. To follow along look at a simple widget like [rhtmlTemplate](https://github.com/Displayr/rhtmlTemplate).

**Build files**
* **package.json** - this lists all of the npm dependencies. When the project is initially checked out from git, the first thing a developer does is run `npm install`. The `npm install` command reads the `package.json` file and locally installs all of the specified dependencies into the `node_modules` directory.
* **gulpfile.js** - this usually just calls `rhtmlBuildUtils.registerGulpTasks(..)`. If the widget repo has any overriden or custom tasks they will be defined (or at least referenced) from this file.
* **build/config/widget.config.json** - a config file used by `rhtmlBuiltUtils`. Defaults for this file are defined in [rhtmlBuildUtils/build/config/default.widget.config.js](https://github.com/Displayr/rhtmlBuildUtils/blob/master/src/build/config/default.widget.config.js) file. 

**Auto Generated files**
* **browser/** - this content is **autogenerated** and is used to test and develop the htmlwidget in a chrome browser context - this is done when running gulp serve.
* **inst/** - this is **autogenerated** and is a required directory where the HTML widget framework will look for all its JS resources
* **R** - this is **autogenerated** and contains the R function signature for the html widget

**Internal WWW files**
* **theSrc/internal_www/content** - this area contains all of the HTML pages for documentation by example and automated testing.
* **theSrc/internal_www/data** - this area contains sets of widget json data sets used in the test automation and the content area. Note this is not necessary, just a convention.
* **theSrc/internal_www/config** - this area contains sets of widget json config and state used in the test automation and the content area. Note this is not necessary, just a convention.
* **theSrc/internal_www/experiments** - just a html scratch space.

**Src Files**
* **theSrc/scripts/** - This is your ES6 source. This is what you change. There are more notes on the source code in the [rhtmlTemplate how the code works](https://github.com/Displayr/rhtmlTemplate/blob/master/docs/how_the_code_works.md) docs.
* **theSrc/images** - put your images here, you can use them in the browser but at present we dont know how to package images in htmlwidgets !
* **theSrc/R/htmlwidget.R** - this is copied to R/WIDGETNAME.R and contains the R function definitions used to invoke your widget. _**You do not need to rename this file.**_
* **theSrc/R/htmlwidget.yaml** - this is copied to inst/htmlwidget/WIDGETNAME.yaml and contains a manifest the htmlwidget framework uses. See [http://www.htmlwidgets.orghttp://www.htmlwidgets.org/develop_intro.html](http://www.htmlwidgets.org/develop_intro.html) for details. _**You do not need to rename this file.**_.
* **theSrc/styles/main.less** - this is your CSS in a less file. It is used to generate `inst/htmlwidgets/lib/style/main.css`

**Spec Test Files**
* **theSrc/scripts/*.spec.js** - These are karma test files. See [https://karma-runner.github.io/](https://karma-runner.github.io/) for docs on how to write tests using Karma. The last few widgets developed have relied 100% on visual snapshot testing, and did not use spec testing.

**BDD / Visual Regression Test Files**

Broadly speaking your BDD tests are made up of features, steps, and page objects. More complex implementation would have core libs to perform logic so that the steps do not need to contain the logic, but this is a small BDD implementation. More info in the [visual regression testing](/docs/visual_regression_testing.md) docs.

* **.tmp/snapshots.feature** - the auto generated BDD feature file for taking snapshots of widgets in the internal_www/content area. Built by the `buildSnapshotsFeatureFile` task defined in rhtmlBuildUtils. 
* **bdd/features/** - this area contains BDD Feature containing test definitions. There is no set format for the organization of these files, but the must end in `.feature`  
* **bdd/pageObjects** - the area contains one or page object definitions specific to your widget. The page object abstracts the widget under test, making the BDD tests more maintainable.
* **bdd/steps/setup.steps.js** - tyically just a step to add an instance of the widget page object to the test context. See [rhtmlTemplate](https://github.com/Displayr/rhtmlTemplate) for an example.
* **bdd/steps/snapshots.steps.js** - reusable steps to take applitools snapshots
* **bdd/steps/widgetInteraction.steps.js** - these are the steps that are specific to your widget (click component X in the widget, drag the thing, etc.). This can be broken into any number of files, but they must end in `.steps.js`

# Terminology/Technology Breakdown

What does the above really mean ?

**Node project** : Fundamentally all this means is two things:

1. the project contains nodejs code (which is just javascript run on the "server" not in the "browser")
1. there is a package.json file at the project root, and that package.json file defines all of the nodejs and browser javascript that is required for the project.

Once a git repo has a package.json, then anyone who clones the repo onto their local machine can download all of the project dependencies simply by running `npm install`. This of course assumes that node and npm are already installed.

**Transpile ??** : Compiling is generally understood to be converting a higher level of abstraction into a lower one, for example taking C++ and producing X86 assembly code. Transpiling is converting to/from languages of equal levels of abstraction, for example coffeescript to ES5 javascript, or ES6 javascript to ES5 javascript. This is necessary because modern web browsers still do not have consistent 100% support for ES6 (aka ES2015) javascript. At present, if you want your javascript to work in a good percentage of your customers' browsers, then you need to produce ES5. The problem is that ES5 is missing a LOT of modern language features and makes developers sad.

**HTML Widget Packages**: A R HTML Widget is a special type of R package that contains R code, as well as Javascript. In the case of most HTML Widgets (warning arbitrary stat) 95%  of the code is Javascript and there is very little R code. The majority of our 3rd party dependencies are Javascript packages, so it makes sense to adopt a dependency management system and best practices from the nodejs community (i.e., npm packaging and gulp build tool). However, the end product is still R code. We need a way to use npm to dynamically pull all our dependencies, but still produce a compliant R HTMLWidget package, enter the ....

**Gulp Build System**: Gulp is one of several nodejs based task managers that provide standard ways to define multi step development tasks such as code packaging, code testing, code compiling, and many other common tasks. It's kind of like `make` . Alternatives exist such as grunt and webpack; we are using gulp. Gulp is easiest understood by providing examples, which are provided in the next section.

## I'm totally sold! How do I make my htmlwidget use this system ?

Excellent, it would be great if we had a yeoman/cookie cutter style project template, but in the absense of that, follow the instructions in [rhtmlTemplate exending the template](https://github.com/Displayr/rhtmlTemplate/blob/master/docs/extending_the_template.md). 
