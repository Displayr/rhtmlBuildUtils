# Overview

The test plan is composed of yaml files in the `theSrc/test_plans` directory that are used to build html pages that render the widgets with specific configs. See the following repos for examples of test_plans:

 * [rhtmlDonut](https://github.com/Displayr/rhtmlDonut)
 * [rhtmlPalmTrees](https://github.com/Displayr/rhtmlPalmTrees)
 * [rhtmlMoonPlot](https://github.com/Displayr/rhtmlMoonPlot)

During the BDD test phase in Travis CI snapshots are taken of these pages, and compared to a baseline using Applitools.

This provides coverage against any form of static visual regression. 

YAML is a config specification language that is meant to be easier to edit than JSON. Read more [here](https://yaml.org/spec/1.2/spec.html#id2761803) ; skip to chapter 2 for examples. 

**There are 5 supported test definition types:**

* **single_widget_single_page:** display a single widget on a page
* **multi_widget_single_page:** display multiple widgets on a page, each is defined individually in the file
* **single_page_one_example_per_config:** display multiple widgets on a page, each widget differs only be a config statement. Each widget is a merge of the single data and the variable config
* **single_page_one_example_per_data:** display multiple widgets on a page, each widget differs only by a data statement. No merge between config and data takes place 
* **for_each_data_in_directory:** 

# Common fields

The following fields can be used in any test definition 

* **testname:** string. name of test. Defaults to the filename
* **groupname:** string. group name of test. Used on the index page to group tests. Defaults to top level directory of test file within the test_plan diractory. e.g. test_plan/a/b/c -> groupname : a
* **title:** string. text to display at top of page
* **type:** string. One of the five testDefinition types
* **width:** int. Default width of each widget on page. Can be overriden for each widget in *multi_widget_single_page* types
* **width:** int. Default height of each widget on page. Can be overriden for each widget in *multi_widget_single_page* types
* **rowSize:** int. how many widgets per row on the page    
* **data:** string or array of strings. See TODO for more details.
* **data_directory:** path to a data directory, relative to the internal_www directory.
* **config:** string or array of strings. See TODO for more details.
* **general_comments:** string or array of strings. These comments will appear at top of file. Accepts HTML. See TODO add palmtree ordering URL as an example
* **comments:** array of comment objects, each containing location, text, and status. See TODO for more detail.

# Test Definition Types          

## single_widget_single_page

    testname: example of single_widget_single_page
    type: single_widget_single_page
    config: data.test_plan.abc_rbg

## multi_widget_single_page

    testname: example of multi_widget_single_page
    type: multi_widget_single_page
    rowSize: 2
    height: 100
    width: 100
    widgets:
      - config: config_can_be_string
        height: 200
        width: 200
      - config: 
          - config_can_be_an_array_part1
          - the array of configs will be merged together

## single_page_one_example_per_config

    testname: example of single_page_one_example_per_config
    type: single_page_one_example_per_config
    width: 400
    height: 200
    data: data1
    config:
      - config1
      - config2

## single_page_one_example_per_data

    testname: example of single_page_one_example_per_data
    type: single_page_one_example_per_data
    width: 400
    height: 200
    rowSize: 2
    config: baseConfig
    data:
      - data1
      - data2

## for_each_data_in_directory

    testname: example of for_each_data_in_directory
    type: for_each_data_in_directory
    data_directory: "data/dir"
    use_config_as_title: true

# Specifying data and config

Broadly, anywhere that data and config are specified, the following rules apply:

* you can reference a json file that contains the config by using dot notation location of the file relative to the internal_www directory. So a file at internal_www/data/example1.json can referenced as `config: data.example1`
* you can combine file references and the test suite will do a deep merge right on the files (aka last value wins). So this is valid too and will combine example 1 and example 2: `config: data.example1|data.example2`
* you can specify the actual config in JSON format : `config: { "a": 2, "b": 3}`
* you can combine file references and JSON specs : `config: data.example1|{ "a": 2, "b": 3}`
* from perspective of test suite, config and data are interchangeable. All the rules above apply to the data sections as well. We distinguish data and config purely at a conceptual level. It is common to say "I want to test the x config on these 6 data sets". This are two ways we would do this:

Use a single_page_one_example_per_data test definition
    
    testname: example of single_page_one_example_per_data
    type: single_page_one_example_per_data
    width: 400
    height: 200
    rowSize: 2
    config: config.x
    data:
      - data.real_world.example1
      - data.real_world.example2

This would generate a single page, that contains 2 widgets in a single row. Widget one would use config `config.x|data.real_world.example1` and widget two would use `config.x|data.real_world.example2`
     
Use a for_each_data_in_directory test definition 

    testname: example of single_page_one_example_per_data
    type: single_page_one_example_per_data
    width: 400
    height: 200
    rowSize: 2
    config: config.x
    data_driectory: "data/real_world"
    
This would generate two pages, each containing a single widget. Page one would use config `config.x|data.real_world.example1` and Page two would use `config.x|data.real_world.example2`    

In some cases we want to say I want to test 5 different config against this data set. This can be done using single_page_one_example_per_config:

    testname: example of single_page_one_example_per_config
    type: single_page_one_example_per_config
    width: 400
    height: 200
    rowSize: 2
    data: data.real_world.example1
    data:
      - config.x
      - config.y|config.b
      - config.z
      
This would generate a single page, that contains 3 widgets split across 2 rows. Widget 1 uses config `data.real_world.example1|config.x`, widget 2 uses `data.real_world.example1|config.y|config.b` and widget 3 uses `data.real_world.example1|config.z`.

# Adding comments / flagging issues

If there are any issues with a specific widget example you can use the comments field to add 1 or more comments on the widgets. Comments have a text and status field, when statuses are yellow or red, they are hilighted on the index page, and the widget is wrapped with a yellow/red boder, both of which provide a convenient way to hilight regressions or known issues during development of widgets.

Each comment has three fields:
* location: number or string. See below for usage instruction
* text: the actual comment text
* status: enum. \[green|yellow|red\] , defaulting to red. This determines the border color on the widget page, and the bullet point color on the index page. 

When a testDefinition contains multiple widgets examples, we must specify which widget a comment applies to. The two options for doing this are to provide a zero based numeric index, which is pretty self explanatory, or a string, which is used in a regex on the test name / file to identify which widget is affected. The example below show how location will be interpreted.

TODO also reference test (which is source of truth for current behaviour)

    title: a page with three widgets on it
    testname: a page with three widgets on it
    width: 400
    height: 400
    rowSize: 2
    type: single_page_one_example_per_data
    comments:
      - location: data2
        text: this test is broken
        status: red
      - location: 0
        text: this test shows some undesirable behaviour
        status: yellow
    data:
      - data1
      - data2
      - data3

Note for `for_each_data_in_directory` testDefinitions, the best comment location to use is the fileName, as this will not change.

