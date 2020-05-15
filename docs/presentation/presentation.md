# Displayr rHTML Build System

![displayr](./assets/displayr.png)

---

# Presentation Assumptions

* HTML / JS familiarity
* Displayr HtmlWidget familiarity

---

# Agenda

1. What does build system provide
1. Local web server
1. Widget renderer
1. Configs of configs
1. Snapshot system
1. Interaction testing
1. Experiment framework

---

# What does rHTML Build System Provide

* code packaging
* local web server for development
* snapshotting system
* experiment framework

## Objectives

* I don't want to think about R until final verification stage
* I want quick visual feedback
* 100 widget configs should not require 100 json files with 99% duplication

---

# Local Web Server For Development

---

# Local web server

* basic stuff
    * host static content
    * live reload content
    * watch files and run build commands 

---
    
# Widget Renderer

## Two ways to render widget content using the server

### 1) put the config in the example block within the html

    <h2>Custom Colors (Inline)</h2>
    <div>
      <div class="example">
        { "colors": ["brown", "lightblue", "aqua", "pink"] }
       </div>
    </div>

---

# Widget Renderer

## Two ways to render widget content using the server

### 2) put the config in files, combine the files within the html

    <h2>Custom Colors (File Reference)</h2>
    <div>
      <div 
        class="example" 
        data-config="config.default|data.different_colors"
      >
      </div>
    </div>
    
---

# Widget Renderer

## Bonus, can also specify user state

    <div 
      class="example"
      data-config="config.default|data.different_colors" 
      data-state="state.pink_selected"
    ></div>
    
---

# Widget Renderer : Bonuses

* can build tutorials as its all just HTML
* can specify widget sizing
* can add rerender capabilities
* can add resize capabilities

# Plot Twist

I no longer recommend using the above for maintaining test suites

TODO : find examples still using old way

---

# Configs of Configs

---

# Configs to generate HTML

* Separate configs , data, and state on file system
* Use yaml test plans to specify html content

Example: Multi widget on a single page

    type: multi_widget_single_page
    title: "test"
    width: 400
    height: 400
    rowSize: 4
    widgets:
      - config: 'data.red_theme'
      - config: 'data.blue_theme'
      
---

# Configs to generate HTML

* Separate configs , data, and state on file system
* Use yaml test plans to specify html content

Example: Make a widget for each config in this directory

    version: 1
    data_directory: "data/functionalTest"
    width: 600
    height: 600
    type: for_each_data_in_directory
    use_config_as_title: true
      
---

# Recap

* using what we have reviewed so far we can specify many combinations of configs for our widgets and we can arrange them on the page
* as we make changes to our code, the build system will recompile our code, reload the browser, and we can see our changes in real time

## Whats missing

* Automated highlighting of changes
* Some mechanism of specifying what is correct

---

# Snapshot System

---

# Snapshot System

## Capabilities

* We generate png screenshots of each widget and save them
* We regenerate png screenshots, if anything changes we generate a diff of the two
* We can run these snapshots locally or in CI
* Performance : about 1 - 2 / second assuming the widget code is fast

---

# Snapshot System

## Technology

* `jest` as the test engine
* `pupetteer` to control the browser
* `pixelmatch` to do image diffs
* `jest-image-snapshot` jest extension that wraps pixelmatch

---

# Interaction Tests

* Use all the same technologies
* Requires scripting to orchestrate the interactions
* Take snapshots at specific points
* Verify outgoing state

---

# Experiments

---

What if I want to compare 4 different setting combos across 100+ configurations ? 

Two parts:
* Experiment Runner
* Experiment UI
  * cross experiment comparisons