# Snapshotting System

## Quick Reference: how to use and extend it

* to run the visual regression suite : `gulp testVisual`
* to run the visual regression suite if `gulp serve` is already running: `gulp testVisual_s`
* to run the visual regression suite on a subset of the tests : `gulp testVisual_s -t=FILTER`. Only tests whose name matches FILTER will be run
* to accept the current snapshots and override the existing snapshots (aka what I have is the new baseline): `gulp testVisual_s -u`
* to view the visual regression results: look at the collection of snapshots in the `<projectRoot>/theSrc/test/snapshots` directory for the current env and git branch. For example if you are doing local development on a branch called VIS-778 then look in the `<projectRoot>/theSrc/test/snapshots/local/VIS-778` directory  
* to see all the diffs for the failed snapshots:
    * these diffs will be stored in `__diff_output__` directories in the `<projectRoot>/theSrc/test/snapshots/local/BRANCH` directory.
    * to collect them all into a single directory use this handy command on sensible a OS: 
    
    ```mkdir .tmp/diffs/; for I in `find theSrc/test/snapshots/local/VIS-513 -type d -name __diff_output__`; do cp $I/* .tmp/diffs/; done```

    or more simply `npm run gatherMasterDiffs` or `npm run gatherDiffs`

* to add a new visual regression test that does not require interaction with the widget: create a new yaml file in the `<projectRoot>/theSrc/test/snapshotTestDefinitions` directory or add to an existing yaml test definition file
* to add a new visual regression test that does require interaction with the widget:
    * create a new test file in `<projectRoot>/theSrc/test/bin`, then follow the patterns established in other repos that use rhtmlBuildUtils and consult the [puppeteer documentation](https://github.com/puppeteer/puppeteer/blob/master/docs/api.md) 
* to see browser log messages during a visual regression run : NOT IMPLEMENTED
* to retrieve the snapshots from travis CI:
    * you will need a programmatic access key setup and have awscli installed which is beyond the scope of these docs (for now). Assuming the profile setup is called `personal` and the upload bucket configured in [travis-ci](https://travis-ci.com/) this command would download all remote snapshots to a local directory called s3. Next you would need to identify the build number for the snapshots you require and then navigate the directory tree.
    * aws --profile=personal s3 sync s3://travis-scatter-diffs s3
* to update the master travis snapshots:
    * follow the steps above to retrieve snapshots from travis-ci
    * copy those snapshots into the `<projectRoot>/theSrc/test/snapshots/travis/master` directory

**Note:** that in some repos we define npm commands in the `package.json` file that "wrap" the gulp commands. So for example in the `rhtmlTemplate` and `rhtmlLabeledScatter` repos we can run the snapshot suite by running `npm run localTest`.

## Technology Breakdown

  * [jest](https://github.com/facebook/jest) : test runner : maintained by facebook
  * [puppeteer](https://github.com/puppeteer/puppeteer) : browser control : maintained by google chrome development team
  * [jest-image-snapshot](https://github.com/americanexpress/jest-image-snapshot) : the jest integration and state manager : maintained by american express
  * [pixelmatch](https://github.com/mapbox/pixelmatch) : the actual image diffing library : maintained by mapbox

## How does it work

#### static snapshots

* In the repo there are sets of widget configs and sets of test plans that define "render this config with this dimensions", or more complex "merge these two configs then render with these dimensions" <-- this has not changed
* The 'jest' test driver loads each test in the test plan, then takes a named snapshot using the 'jest-image-snapshot' jest plugin. If a snapshot doesn't already exist for that name, then the plugin simply saves the image. If a snapshot does exist for that name, then the plugin uses 'pixelmatch' to compare the existing and new snapshot. If the two images are the same, the test passes. If they are different the test fails and a "diff" image is saved, which is a png showing the old, the new, and a diff.

#### Interactions Tests + Snapshots

* These work similar to static snapshots except the test setup is more complex. In the static scenario we simply load the widget. In the interaction scenarios we load the widget, sometimes with an initial config, then interact with it, and we take snapshots at various stages throughout the process. The snapshotting works the same

#### Branches and Environments
---
* when the test is run two params are passed : the branch and the env. the defaults are env:local and branch:master. This determines the snapshot directory to use. This allows us to maintain different sets of snapshots for different branches and environments. The other environment that is used is travis.

Why we need different snapshot sets for different environments

* Images have subtle rendering differences between environments, particularly caused by different graphics cards, different OS, and different browsers. We had this issue with Applitools as well.

Why we need different snapshot sets for different branches

During work on VIS-513 I probably went through 10 rounds of changes where I said : ok I need to see what effect this specific change will have. Having different snapshot sets for master and for VIS-513 allows me to preserve what master looks like while I rebaseline the VIS-513 set on each iteration. When I am finally satisfied, then I rebaseline master, and discard the VIS-513 snapshots.

## AWS dependencies

*NOTE* this feature is currently disabled in some widget repos but is gradually being made available when repos are worked on.

The snapshotting system saves the snapshot images to the local disk. In the travisCI case that means the images, and importantly the "diff images", are saved to the disk on the travisCI machine. Some questions follow from this : 

* We want those images, so how do we get them? 
* We want to fail a build if the snapshots change, therefore we need to have a baseline that was produced in the TravisCI environment; how do I get that baseline ?

Travis CI provides a solution to save "artifacts" produced during a travis build. In our case the snapshot images are artifacts. In the Travis CI config for the widget repo, we specify an AWS bucket, client ID, and client secret. This allows Travis CI to upload the snapshot images to an area in AWS S3 that we can retrieve.

The Travis -> AWS S3 solution required 3 steps

1. Configure your AWS account to allow upload to a specific bucket to anyone who possesses a programmatic access key. I do not yet have step by step documentation but anyone with moderate AWS muddling skills can get this working. There is already an S3 bucket set up for widget snapshots under the Displayr AWS account.

2. Add this to the .travis.yml in your repo

    addons:
      artifacts:
        paths:
          - theSrc/test/snapshots/travis

3. In travis UI add the required AWS settings as environment variables (AWS bucket, client ID, and client secret). Contact Justin Yap or someone with admin access to the Displayr AWS account for the name of the AWS S3 bucket for widget snapshots, client ID, and client secret.

Travis docs : 

* artifact API https://docs.travis-ci.com/user/uploading-artifacts/
* same info in blog format : https://blog.travis-ci.com/2012-12-18-travis-artifacts

## Image matching sensitivity

The snapshotting system uses the [pixelmatch](https://github.com/mapbox/pixelmatch) library to compare images. The rhtmlBuildUtils framework exposes two configuration values to control the behaviour of the pixelmatch library.

1. What is a diff : the library allows you to configure a sensitivity where small differences will not be considered "different". See the images [here](./snapshotting_system/pixelmatch_sensitivity_example.md) to see examples of results at different sensitivities
2. How many differences are allowed : the library allows you to specify how many differences are allowed before the test fails

The rhtmlBuildUtils framework also allows you to specify these settings at different levels: 

1. the repo level, via modifying the `build/config/widget.config.js` config
   
```js
{
  snapshotTesting: {
    pixelmatch: {
      // smaller values -> more sensitive : https://github.com/mapbox/pixelmatch#pixelmatchimg1-img2-output-width-height-options
      customDiffConfig: {
        threshold: 0.0001, // how much diff is actually classified as a diff
      },
      failureThreshold: 0.0001, // how many diffs are allowed before the test fails
      failureThresholdType: 'percent', // pixel or percent
    },
  },
}
```

see [here](https://github.com/Displayr/rhtmlDonut/blob/master/build/config/widget.config.js#L26) for example use in rhtmlDonut

2. for specific static snapshots, via adding config the snapshot `yaml` file

```yaml
version: 1
type: multi_widget_single_page
pixelmatchConfig:
    customDiffConfig:
        threshold: 0.01
    failureThreshold: 1000
    failureThresholdType: pixel
widgets:
    ...
```

see [here](https://github.com/Displayr/rhtmlDonut/blob/master/theSrc/test/snapshotTestDefinitions/test_plans/label_performance_tests/increasing_values_150_with_offsets.yaml#L9) for example use in rhtmlDonut

3. for specific interaction tests, via adding config in the jest test file 

```js
// custom pixelmatch threshold as several tests consistently have a few 1000 pixel diff
configureImageSnapshotMatcher({
  collectionIdentifier: 'tooltip_interaction',
  pixelMatchConfig: {
    failureThreshold: 8000,
    failureThresholdType: 'pixel', // pixel or percent
  },
})
```

see [here](https://github.com/Displayr/rhtmlDonut/blob/master/theSrc/test/bin/tooltipInteractions.jest.test.js#L15) for example use in rhtmlDonut

## How to manually compare images ?

pixelmatch is also exposed as an executable from the command line:

```pixelmatch A.png B.png diff.png 0.1```

## Future Work

### Easier Travis Snapshot Updating

The current process to update travis snapshots is pretty laborious:
    * delete the snapshots from git, 
    * push, 
    * wait for travis build to run, which creates snapshots,   
    * retrieve snapshots via S3
    * add to git and commit
    * get green build
    
Proposal is to put something in the commit message that will cause the build to add the -u flag to the `gulp testVisual command`
